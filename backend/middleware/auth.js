const jwt = require("jsonwebtoken")
const prisma = require("../config/prisma")
const HttpError = require("../utils/httpError")

async function authenticate(req, res, next) {
  try {
    const authorization = req.get("authorization")
    if (!authorization?.startsWith("Bearer ")) {
      throw new HttpError(401, "Authentication required")
    }

    const token = authorization.slice(7)
    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      throw new HttpError(401, "Invalid or expired authentication token")
    }

    if (!payload.sub) throw new HttpError(401, "Invalid authentication token")

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        department: true,
        roles: {
          where: { revokedAt: null },
          include: { role: true },
        },
      },
    })

    if (!user || !user.isActive) {
      throw new HttpError(401, "Account is unavailable")
    }

    const safeUser = { ...user }
    delete safeUser.passwordHash
    req.user = safeUser
    req.auth = { token, payload }
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = { authenticate }
