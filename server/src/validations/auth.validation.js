const { body } = require('express-validator');

exports.registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    // Admin registration might not require role validation if it's hardcoded in controller, but let's be safe
    // If role is provided, it must be 'USER' or 'ADMIN'
    body('role')
        .optional()
        .isIn(['USER', 'ADMIN']).withMessage('Invalid role')
];

exports.loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

exports.changePasswordValidation = [
    body('oldPassword').notEmpty().withMessage('Old password is required'),
    body('newPassword')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
        .custom((value, { req }) => {
            if (value === req.body.oldPassword) {
                throw new Error('New password cannot be the same as old password');
            }
            return true;
        })
];
