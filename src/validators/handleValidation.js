import { validationResult } from 'express-validator';

export const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorArray = errors.array();
        return res.status(400).json({
            msg: errorArray[0].msg,
            errors: errorArray
        });
    }
    next();
};
