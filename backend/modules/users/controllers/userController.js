const userService = require("../services/userService")

async function listUsers(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await userService.listUsers() })
  } catch (error) {
    next(error)
  }
}

async function getUser(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await userService.getUser(req.params.id) })
  } catch (error) {
    next(error)
  }
}

async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body, req.user.id, req.ip)
    res.status(201).json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user.id, req.ip)
    res.status(200).json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

async function replaceRoles(req, res, next) {
  try {
    const user = await userService.replaceRoles(req.params.id, req.body.roleNames, req.user.id, req.ip)
    res.status(200).json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

async function setStatus(req, res, next) {
  try {
    const user = await userService.setStatus(req.params.id, req.body.isActive, req.user.id, req.ip)
    res.status(200).json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, replaceRoles, setStatus }
