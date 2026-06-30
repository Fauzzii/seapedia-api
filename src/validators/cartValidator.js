import { body } from 'express-validator';
import { handleValidation } from './handleValidation.js';

export const validateCartItem = [
    body('product_id')
        .notEmpty().withMessage('product_id wajib diisi')
        .custom((value) => {
            try {
                BigInt(value);
                return true;
            } catch {
                throw new Error('product_id harus berupa ID numerik (BigInt)');
            }
        }),
    body('quantity')
        .notEmpty().withMessage('Kuantitas wajib diisi')
        .isInt({ min: 1 }).withMessage('Kuantitas minimal 1'),
    handleValidation
];
