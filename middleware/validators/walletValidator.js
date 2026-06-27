import { body } from 'express-validator';
import { handleValidation } from './handleValidation.js';

export const validateTopup = [
    body('amount')
        .notEmpty().withMessage('Jumlah topup (amount) wajib diisi')
        .isFloat({ min: 1000 }).withMessage('Topup minimal adalah Rp1.000'),
    handleValidation
];
