const express = require('express');
const authController = require('./auth.controller');
const authenticate = require('../../middlewares/authenticate');

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
