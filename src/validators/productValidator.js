import { body } from 'express-validator';
import { handleValidation } from './handleValidation.js';

export const validateProduct = [
    body('name')
        .trim().notEmpty().withMessage('Nama produk wajib diisi')
        .isLength({ max: 100 }).withMessage('Nama produk maksimal 100 karakter'),
    body('description')
        .optional().trim(),
    body('price')
        .notEmpty().withMessage('Harga produk wajib diisi')
        .isFloat({ min: 0.01 }).withMessage('Harga harus berupa angka lebih besar dari 0'),
    body('stock')
        .notEmpty().withMessage('Stok wajib diisi')
        .isInt({ min: 0 }).withMessage('Stok harus berupa bilangan bulat non-negatif'),
    body('category')
        .optional().trim()
        .isLength({ max: 100 }).withMessage('Kategori produk maksimal 100 karakter'),
    body('images')
        .optional()
        .isArray().withMessage('Images harus berupa array url gambar'),
    body('images.*')
        .optional()
        .isURL().withMessage('Format url gambar tidak valid'),
    handleValidation
];
