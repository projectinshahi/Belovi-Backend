"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const responseHandler_1 = require("../utils/responseHandler");
const env_1 = require("../config/env");
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);
    const statusCode = err.statusCode || 500;
    // A 500's message is internal (a database or library error); outside
    // development the client gets a generic one. 4xx messages are meant for it.
    const message = statusCode >= 500 && env_1.ENV.NODE_ENV !== 'development'
        ? 'Something went wrong. Please try again.'
        : err.message || 'Internal Server Error';
    // Clean up error object for production
    const errors = env_1.ENV.NODE_ENV === 'development' ? err.stack : undefined;
    (0, responseHandler_1.errorResponse)(res, statusCode, message, errors);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map