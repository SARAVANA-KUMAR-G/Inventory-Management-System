const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/responseEnvelope');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  getMe,
  logout
};
