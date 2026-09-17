const express = require('express');
const reportController = require('./report.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

// Reports are restricted to Admin
router.get('/stock', authorize([ROLES.ADMIN]), reportController.getStockReport);
router.get('/movement', authorize([ROLES.ADMIN]), reportController.getStockMovementReport);
router.get('/sales', authorize([ROLES.ADMIN]), reportController.getSalesReport);
router.get('/:type/export', authorize([ROLES.ADMIN]), reportController.exportReportCsv);

module.exports = router;
