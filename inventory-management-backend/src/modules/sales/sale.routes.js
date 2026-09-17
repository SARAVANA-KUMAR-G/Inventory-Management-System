const express = require('express');
const saleController = require('./sale.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize([ROLES.ADMIN, ROLES.STAFF]), saleController.listSales);
router.post('/', authorize([ROLES.ADMIN, ROLES.STAFF]), saleController.createSale);
router.get('/:id', authorize([ROLES.ADMIN, ROLES.STAFF]), saleController.getSaleById);
router.post('/:id/returns', authorize([ROLES.ADMIN, ROLES.STAFF]), saleController.processReturn);
router.post('/:id/return', authorize([ROLES.ADMIN, ROLES.STAFF]), saleController.processReturn);

module.exports = router;
