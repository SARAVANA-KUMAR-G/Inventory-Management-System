const express = require('express');
const categoryController = require('./category.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = express.Router();

router.use(authenticate);

// List categories accessible by both ADMIN and STAFF
router.get('/', authorize(['ADMIN', 'STAFF']), categoryController.listCategories);

// Category modifications restricted to ADMIN
router.post('/', authorize(['ADMIN']), categoryController.createCategory);
router.patch('/:id', authorize(['ADMIN']), categoryController.updateCategory);
router.patch('/:id/status', authorize(['ADMIN']), categoryController.updateCategoryStatus);
router.delete('/:id', authorize(['ADMIN']), categoryController.deactivateCategory);

module.exports = router;
