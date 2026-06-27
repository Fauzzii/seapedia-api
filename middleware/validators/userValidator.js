import { body } from 'express-validator';
import { handleValidation } from './handleValidation.js';

export const validateRegister = [
    body('full_name')
        .trim().notEmpty().withMessage('Nama lengkap wajib diisi')
        .isLength({ max: 100 }).withMessage('Nama maksimal 100 karakter'),
    body('email')
        .isEmail().normalizeEmail().withMessage('Format email tidak valid'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
        .matches(/^(?=.*[a-zA-Z])(?=.*\d)/).withMessage('Password harus mengandung huruf dan angka'),
    handleValidation
];

export const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi'),
    handleValidation
];

export const validateUpdateUser = [
    body('full_name').optional()
        .trim().notEmpty().withMessage('Nama lengkap tidak boleh kosong')
        .isLength({ max: 100 }).withMessage('Nama maksimal 100 karakter'),
    body('email').optional()
        .isEmail().normalizeEmail().withMessage('Format email tidak valid'),
    body('password').optional()
        .isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
        .matches(/^(?=.*[a-zA-Z])(?=.*\d)/).withMessage('Password harus mengandung huruf dan angka'),
    handleValidation
];


