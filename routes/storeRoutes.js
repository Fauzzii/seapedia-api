import express from 'express';
import { getStores, getStoreById, createStore, updateSellerStore, deleteStore } from '../controllers/storeController.js';
import { verifyUser, requireActiveRole } from '../middleware/AuthUser.js';
import { validateStore } from '../middleware/validators/storeValidator.js';

const router = express.Router();

// Public store
router.get('/stores', getStores);
router.get('/stores/:id', getStoreById);

// Seller store
router.post('/seller/store', verifyUser, requireActiveRole('SELLER'), validateStore, createStore);
router.put('/seller/store', verifyUser, requireActiveRole('SELLER'), validateStore, updateSellerStore);
router.delete('/seller/store/:id', verifyUser, deleteStore);

export default router;
