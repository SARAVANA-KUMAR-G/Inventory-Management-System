const express = require('express');
const productController = require('./product.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = express.Router();

router.use(authenticate);

// View & export accessible to both ADMIN and STAFF
router.get('/', authorize(['ADMIN', 'STAFF']), productController.listProducts);
router.get('/export', authorize(['ADMIN', 'STAFF']), productController.exportProducts);
router.get('/:id', authorize(['ADMIN', 'STAFF']), productController.getProductById);

// Product modifications & import restricted to ADMIN
router.post('/', authorize(['ADMIN']), productController.createProduct);
router.patch('/:id', authorize(['ADMIN']), productController.updateProduct);
router.delete('/:id', authorize(['ADMIN']), productController.deactivateProduct);
router.post('/import', authorize(['ADMIN']), productController.importProducts);

module.exports = router;
