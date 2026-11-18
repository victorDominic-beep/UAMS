const service = require("../services/sivService")
const { getUserRoleNames } = require("../../../config/roles")

async function create(req, res, next) {
  try { res.status(201).json({ success: true, data: await service.createSiv(req.body, req.user, req.ip) }) } catch (error) { next(error) }
}
async function list(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.listSivs(req.validatedQuery || req.query, req.user, getUserRoleNames(req.user)) }) } catch (error) { next(error) }
}
async function getById(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.getSiv(req.params.id, req.user, getUserRoleNames(req.user)) }) } catch (error) { next(error) }
}
async function approve(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.approveSiv(req.params.id, req.user, req.ip) }) } catch (error) { next(error) }
}
async function pendingReceipt(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.listPendingReceipt(req.user) }) } catch (error) { next(error) }
}
async function confirmReceipt(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.confirmReceipt(req.params.id, req.user, req.ip) }) } catch (error) { next(error) }
}

module.exports = { create, list, getById, approve, pendingReceipt, confirmReceipt }
