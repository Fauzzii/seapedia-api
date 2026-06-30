import express from 'express';
import { upload, uploadProductImages } from '../controllers/uploadController.js';
import { verifyUser } from '../middleware/AuthUser.js';

const router = express.Router();

// POST /api/upload/images — upload 1-5 gambar produk ke Supabase
// Field name: "images" (multiple)
router.post('/images', verifyUser, upload.array('images', 5), uploadProductImages);

export default router;
