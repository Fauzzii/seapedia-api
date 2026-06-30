import express from 'express';
import { 
    getMonitoringUsers, 
    getMonitoringStores, 
    getMonitoringProducts, 
    getMonitoringOrders, 
    getMonitoringDiscounts, 
    getMonitoringDeliveries, 
    getMonitoringOverdue, 
    createVoucher, 
    getVouchers, 
    getVoucherById, 
    createPromo, 
    getPromos, 
    getPromoById, 
    advanceTime, 
    runOverdueCheck,
    adminCreateUser
} from '../controllers/adminController.js';
import { updateProduct, deleteProduct } from '../controllers/productController.js';
import { updateOrderStatus } from '../controllers/orderController.js';
import { verifyUser, requireActiveRole } from '../middleware/AuthUser.js';
import { validateProduct } from '../validators/productValidator.js';

const router = express.Router();

router.use(verifyUser);
router.use(requireActiveRole('ADMIN'));

router.get('/monitoring/users', getMonitoringUsers);
router.get('/monitoring/stores', getMonitoringStores);
router.get('/monitoring/products', getMonitoringProducts);
router.get('/monitoring/orders', getMonitoringOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/monitoring/discounts', getMonitoringDiscounts);
router.get('/monitoring/deliveries', getMonitoringDeliveries);
router.get('/monitoring/overdue', getMonitoringOverdue);

router.post('/users', adminCreateUser);

router.put('/products/:id', validateProduct, updateProduct);
router.delete('/products/:id', deleteProduct);

router.post('/vouchers', createVoucher);
router.get('/vouchers', getVouchers);
router.get('/vouchers/:id', getVoucherById);

router.post('/promos', createPromo);
router.get('/promos', getPromos);
router.get('/promos/:id', getPromoById);

router.post('/system/advance-time', advanceTime);
router.post('/system/run-overdue-check', runOverdueCheck);

export default router;
