const HttpError = require("../utils/httpError")

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  })
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)

  const prismaStatus = {
    P2002: 409,
    P2003: 400,
    P2025: 404,
    P2034: 409,
  }[error.code]
  const statusCode =
    error instanceof HttpError
      ? error.statusCode
      : prismaStatus || (error.statusCode && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500)

  const response = {
    success: false,
    error: statusCode === 500 ? "Internal server error" : error.message,
  }

  if (error.details) response.details = error.details
  if (process.env.NODE_ENV !== "production" && statusCode === 500)
    response.stack = error.stack

  res.status(statusCode).json(response)
}

module.exports = { notFound, errorHandler }
