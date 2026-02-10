const { body, param } = require('express-validator');

exports.uploadBookValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title too long'),
    // .escape() removed

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description too long'),
    // .escape() removed to allow special chars like " &

    body('category')
        .trim()
        .notEmpty().withMessage('Category is required')
        .isLength({ max: 50 }).withMessage('Category too long')
        .matches(/^[a-zA-Z0-9\s\-_,&"'.]+$/).withMessage('Invalid characters in category')

];

exports.bookIdValidation = [
    param('id')
        .isInt().withMessage('Invalid Book ID')
        .toInt()
];
