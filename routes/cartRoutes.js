import express from 'express';
import { getCart, addToCart, updateCartItem, deleteCartItem, clearCart } from '../controllers/cartController.js';
import { verifyUser, requireActiveRole } from '../middleware/AuthUser.js';
import { validateCartItem } from '../middleware/validators/cartValidator.js';

const router = express.Router();

router.use(verifyUser);
router.use(requireActiveRole('BUYER'));

router.get('/', getCart);
router.post('/items', validateCartItem, addToCart);
router.put('/items/:id', updateCartItem);
router.patch('/items/:id', updateCartItem);
router.delete('/items/:id', deleteCartItem);
router.delete('/', clearCart);

export default router;
