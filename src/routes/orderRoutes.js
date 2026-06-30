import express from 'express';
import { 
    getOrders, 
    getOrderById, 
    checkout, 
    updateOrderStatus, 
    processOrder, 
    validateDiscount, 
    getSpendingReport, 
    getIncomeReport,
    verifySuccess,
    verifyFailed,
    returnOrder
} from '../controllers/orderController.js';
import { verifyUser, requireActiveRole } from '../middleware/AuthUser.js';
import { validateCheckout } from '../validators/orderValidator.js';

const router = express.Router();

router.use(verifyUser);

router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);

// Buyer Order routes
router.post('/buyer/checkout', requireActiveRole('BUYER'), validateCheckout, checkout);
router.post('/buyer/checkout/validate-discount', requireActiveRole('BUYER'), validateDiscount);
router.get('/buyer/orders', requireActiveRole('BUYER'), getOrders);
router.get('/buyer/orders/:id', requireActiveRole('BUYER'), getOrderById);
router.post('/buyer/orders/:id/verify-success', requireActiveRole('BUYER'), verifySuccess);
router.post('/buyer/orders/:id/verify-failed', requireActiveRole('BUYER'), verifyFailed);
router.post('/buyer/orders/:id/return', requireActiveRole('BUYER'), returnOrder);
router.get('/buyer/reports/spending', requireActiveRole('BUYER'), getSpendingReport);

// Seller Order routes
router.get('/seller/orders', requireActiveRole('SELLER'), getOrders);
router.get('/seller/orders/:id', requireActiveRole('SELLER'), getOrderById);
router.post('/seller/orders/:id/process', requireActiveRole('SELLER'), processOrder);
router.get('/seller/reports/income', requireActiveRole('SELLER'), getIncomeReport);

export default router;
