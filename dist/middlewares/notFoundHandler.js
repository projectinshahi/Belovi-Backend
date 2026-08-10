"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const responseHandler_1 = require("../utils/responseHandler");
const notFoundHandler = (req, res, next) => {
    (0, responseHandler_1.errorResponse)(res, 404, `Route not found - ${req.originalUrl}`);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=notFoundHandler.js.map