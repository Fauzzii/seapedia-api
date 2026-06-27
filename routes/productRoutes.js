import express from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getSellerProducts, getProductReviews, createProductReview } from '../controllers/productController.js';
import { verifyUser, requireActiveRole } from '../middleware/AuthUser.js';
import { validateProduct } from '../middleware/validators/productValidator.js';

const router = express.Router();

// Public product
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.get('/products/:id/reviews', getProductReviews);

// Buyer product review
router.post('/products/:id/reviews', verifyUser, requireActiveRole('BUYER'), createProductReview);

// Seller product
router.get('/seller/products', verifyUser, requireActiveRole('SELLER'), getSellerProducts);
router.post('/seller/products', verifyUser, requireActiveRole('SELLER'), validateProduct, createProduct);
router.put('/seller/products/:id', verifyUser, requireActiveRole('SELLER'), validateProduct, updateProduct);
router.delete('/seller/products/:id', verifyUser, requireActiveRole('SELLER'), deleteProduct);

export default router;
