import { body } from 'express-validator';
import { handleValidation } from './handleValidation.js';

export const validateCheckout = [
    body('address_id')
        .notEmpty().withMessage('address_id wajib diisi')
        .custom((value) => {
            try {
                BigInt(value);
                return true;
            } catch {
                throw new Error('address_id harus berupa ID numerik (BigInt)');
            }
        }),
    body('voucher_code')
        .optional().trim().notEmpty().withMessage('Kode voucher tidak boleh kosong jika disediakan'),
    body('promo_code')
        .optional().trim().notEmpty().withMessage('Kode promo tidak boleh kosong jika disediakan'),
    body('delivery_method')
        .notEmpty().withMessage('delivery_method wajib diisi')
        .isIn(['INSTANT', 'NEXT_DAY', 'REGULAR']).withMessage('delivery_method harus salah satu dari: INSTANT, NEXT_DAY, REGULAR'),
    handleValidation
];
