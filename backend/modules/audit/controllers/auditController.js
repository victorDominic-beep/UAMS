const { listAuditEntries, getAuditEntry } = require("../services/auditQueryService")

async function list(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await listAuditEntries(req.validatedQuery || req.query) })
  } catch (error) {
    next(error)
  }
}

async function getById(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await getAuditEntry(req.params.id) })
  } catch (error) {
    next(error)
  }
}

module.exports = { list, getById }
