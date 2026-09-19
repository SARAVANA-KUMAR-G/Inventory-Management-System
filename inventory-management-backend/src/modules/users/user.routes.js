const express = require('express');
const userController = require('./user.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = express.Router();

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
