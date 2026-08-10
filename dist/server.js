"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const startServer = async () => {
    try {
        // Connect to database
        await (0, db_1.connectDB)();
        // Start Express Server
        app_1.default.listen(env_1.ENV.PORT, () => {
            console.log(`🚀 Server running in ${env_1.ENV.NODE_ENV} mode on port ${env_1.ENV.PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map