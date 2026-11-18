const service = require("../services/srvService")

async function create(req, res, next) {
  try {
    const srv = await service.createSrv(req.body, req.user, req.ip)
    res.status(201).json({ success: true, data: srv })
  } catch (error) {
    next(error)
  }
}

async function list(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await service.listSrvs(req.validatedQuery || req.query) })
  } catch (error) {
    next(error)
  }
}

async function getById(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await service.getSrv(req.params.id) })
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await service.updateSrv(req.params.id, req.body, req.user, req.ip) })
  } catch (error) {
    next(error)
  }
}

async function submit(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await service.submitSrv(req.params.id, req.user, req.ip) })
  } catch (error) {
    next(error)
  }
}

async function approve(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await service.approveSrv(req.params.id, req.user, req.ip) })
  } catch (error) {
    next(error)
  }
}

async function reject(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await service.rejectSrv(req.params.id, req.user, req.ip) })
  } catch (error) {
    next(error)
  }
}

module.exports = { create, list, getById, update, submit, approve, reject }
