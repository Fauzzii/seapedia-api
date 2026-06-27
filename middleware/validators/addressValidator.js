import { body } from 'express-validator';
import { handleValidation } from './handleValidation.js';

export const validateAddress = [
    body('recipient_name')
        .trim().notEmpty().withMessage('Nama penerima wajib diisi')
        .isLength({ max: 100 }).withMessage('Nama penerima maksimal 100 karakter'),
    body('phone')
        .trim().notEmpty().withMessage('Nomor telepon wajib diisi')
        .isLength({ max: 20 }).withMessage('Nomor telepon maksimal 20 karakter'),
    body('address_detail')
        .trim().notEmpty().withMessage('Detail alamat wajib diisi'),
    body('is_default')
        .optional().isBoolean().withMessage('is_default harus berupa boolean'),
    handleValidation
];
