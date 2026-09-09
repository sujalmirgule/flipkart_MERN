const ErrorHandler = require("../utils/errorHandler");

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    // mongodb id error
    if (err.name === "CastError") {
        const message = `Resource Not Found. Invalid: ${err.path}`;
        err = new ErrorHandler(message, 400);
    }

    // mongoose validation error
    if (err.name === "ValidationError") {
        const message = Object.values(err.errors).map(val => val.message).join(", ");
        err = new ErrorHandler(message, 400);
    }

    // mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `Duplicate ${field} entered`;
        err = new ErrorHandler(message, 400);
    }

    // wrong jwt error
    if (err.name === "JsonWebTokenError") {
        const message = 'JWT is invalid, please login again';
        err = new ErrorHandler(message, 401);
    }

    // jwt expire error
    if (err.name === "TokenExpiredError") {
        const message = 'JWT is Expired, please login again';
        err = new ErrorHandler(message, 401);
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
}