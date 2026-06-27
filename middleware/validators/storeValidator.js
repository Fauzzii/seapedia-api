import { body } from 'express-validator';
import { handleValidation } from './handleValidation.js';

export const validateStore = [
    body('store_name')
        .trim().notEmpty().withMessage('Nama toko wajib diisi')
        .isLength({ max: 100 }).withMessage('Nama toko maksimal 100 karakter'),
    body('description')
        .optional().trim(),
    body('address_detail')
        .optional().trim(),
    handleValidation
];
