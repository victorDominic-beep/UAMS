const crypto = require("node:crypto")
const prisma = require("../../../config/prisma")

const AUDIT_ADVISORY_LOCK_KEY = 92471145821n

const SENSITIVE_DELTA_KEYS = new Set([
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "jwt",
  "secret",
])

function sanitizeDelta(value) {
  if (Array.isArray(value)) return value.map(sanitizeDelta)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_DELTA_KEYS.has(key) && !SENSITIVE_DELTA_KEYS.has(key.toLowerCase()))
        .map(([key, child]) => [key, sanitizeDelta(child)]),
    )
  }
  return value
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

function buildHashPayload(entry) {
  return JSON.stringify({
    timestamp: new Date(entry.timestamp).toISOString(),
    userId: entry.userId || null,
    ipAddress: entry.ipAddress || null,
    actionType: entry.actionType,
    entityName: entry.entityName,
    entityId: entry.entityId,
    // PostgreSQL stores JSON as jsonb and does not preserve object key order.
    // Canonical keys make hashes stable before and after a database round trip.
    delta: canonicalize(sanitizeDelta(entry.delta)),
    prevHash: entry.prevHash || null,
  })
}

function computeRowHash(entry) {
  return crypto.createHash("sha256").update(buildHashPayload(entry)).digest("hex")
}

async function recordAudit({
  userId = null,
  ipAddress = null,
  actionType = "OTHER",
  entityName,
  entityId,
  delta = null,
  timestamp = null,
}) {
  if (!entityName || !entityId) {
    throw new Error("Audit entityName and entityId are required")
  }

  const safeDelta = sanitizeDelta(delta)

  try {
    return await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_ADVISORY_LOCK_KEY})`

      const previous = await transaction.auditTrail.findFirst({
        orderBy: [{ timestamp: "desc" }, { id: "desc" }],
        select: { rowHash: true, timestamp: true },
      })

      const requestedTimestamp = timestamp instanceof Date ? timestamp : new Date()
      // PostgreSQL now() is fixed at transaction start. A transaction can wait
      // for the chain lock and then commit with a createdAt earlier than the
      // entry it chained from. Keep the explicit chain timestamp monotonic.
      const entryTimestamp = previous && requestedTimestamp <= previous.timestamp
        ? new Date(previous.timestamp.getTime() + 1)
        : requestedTimestamp
      const entry = {
        timestamp: entryTimestamp,
        userId,
        ipAddress,
        actionType,
        entityName,
        entityId,
        delta: safeDelta,
        prevHash: previous?.rowHash || null,
      }
      const rowHash = computeRowHash(entry)

      return await transaction.auditTrail.create({
        data: { ...entry, rowHash },
      })
    // The advisory lock orders audit writers. ReadCommitted ensures a writer
    // waiting on it sees the latest committed hash-chain tail.
    }, { isolationLevel: "ReadCommitted", timeout: 10000 })
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Audit recording failed:", error.message)
    }
    return null
  }
}

async function verifyAuditChain() {
  const entries = await prisma.auditTrail.findMany({
    orderBy: [{ timestamp: "asc" }, { id: "asc" }],
  })

  let previousHash = null
  for (const entry of entries) {
    if (entry.prevHash !== previousHash) {
      return {
        valid: false,
        reason: "Chain linkage mismatch",
        brokenEntryId: entry.id,
        checkedEntries: entries.indexOf(entry),
        totalEntries: entries.length,
      }
    }

    const payloadEntry = {
      timestamp: entry.timestamp,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      actionType: entry.actionType,
      entityName: entry.entityName,
      entityId: entry.entityId,
      delta: entry.delta,
      prevHash: entry.prevHash,
    }

    if (computeRowHash(payloadEntry) !== entry.rowHash) {
      return {
        valid: false,
        reason: "Row hash mismatch",
        brokenEntryId: entry.id,
        checkedEntries: entries.indexOf(entry),
        totalEntries: entries.length,
      }
    }

    previousHash = entry.rowHash
  }

  return {
    valid: true,
    reason: null,
    brokenEntryId: null,
    checkedEntries: entries.length,
    totalEntries: entries.length,
  }
}

module.exports = {
  recordAudit,
  verifyAuditChain,
  computeRowHash,
  sanitizeDelta,
}
