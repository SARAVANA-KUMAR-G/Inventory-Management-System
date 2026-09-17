const express = require('express');
const inventoryController = require('./inventory.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

// Stock In
router.post('/stock-in', authorize([ROLES.ADMIN, ROLES.STAFF]), inventoryController.stockIn);

// Stock Adjustment (both /adjustment and /adjustments for convenience)
router.post('/adjustment', authorize([ROLES.ADMIN, ROLES.STAFF]), inventoryController.recordAdjustment);
router.post('/adjustments', authorize([ROLES.ADMIN, ROLES.STAFF]), inventoryController.recordAdjustment);

// Transactions ledger
router.get('/transactions', authorize([ROLES.ADMIN, ROLES.STAFF]), inventoryController.listTransactions);

// Stock alerts
router.get('/low-stock', authorize([ROLES.ADMIN, ROLES.STAFF]), inventoryController.getLowStock);
router.get('/out-of-stock', authorize([ROLES.ADMIN, ROLES.STAFF]), inventoryController.getOutOfStock);
router.get('/last-supplier/:productId', authorize([ROLES.ADMIN, ROLES.STAFF]), inventoryController.getLastSupplier);

module.exports = router;
