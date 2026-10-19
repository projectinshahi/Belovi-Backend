import app from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { verifyEmailConnection } from './utils/sendEmail';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Report whether verification emails can go out; logs, never blocks startup.
    void verifyEmailConnection();

    // Start Express Server
    app.listen(ENV.PORT, () => {
      console.log(`🚀 Server running in ${ENV.NODE_ENV} mode on port ${ENV.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
