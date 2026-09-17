const userService = require('./user.service');
const { sendSuccess } = require('../../utils/responseEnvelope');

async function listUsers(req, res, next) {
  try {
    const { page, pageSize, search, role, status } = req.query;
    const result = await userService.listUsers({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      search,
      role,
      status
    });
    return sendSuccess(res, result.items, result.meta);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    return sendSuccess(res, user, null, 201);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

async function deactivateUser(req, res, next) {
  try {
    const user = await userService.deactivateUser(req.params.id);
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deactivateUser
};
