const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const ErrorHandler = require('../utils/errorHandler');
const asyncErrorHandler = require('./asyncErrorHandler');

exports.isAuthenticatedUser = asyncErrorHandler(async (req, res, next) => {
    let token = req.cookies?.token;

    if (!token && req.headers?.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new ErrorHandler("Please Login to Access", 401));
    }

    try {
        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decodedData.id);

        if (!user) {
            return next(new ErrorHandler("User not found", 401));
        }

        req.user = user;
        next();
    } catch (error) {
        return next(new ErrorHandler("Invalid or Expired Token. Please login again.", 401));
    }
});

exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role: ${req.user?.role || 'unknown'} is not allowed to access this resource`, 403));
        }
        next();
    };
};