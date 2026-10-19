import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/responseHandler';
import { ENV } from '../config/env';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);

  const statusCode = err.statusCode || 500;
  // A 500's message is internal (a database or library error); outside
  // development the client gets a generic one. 4xx messages are meant for it.
  const message =
    statusCode >= 500 && ENV.NODE_ENV !== 'development'
      ? 'Something went wrong. Please try again.'
      : err.message || 'Internal Server Error';

  // Clean up error object for production
  const errors = ENV.NODE_ENV === 'development' ? err.stack : undefined;

  errorResponse(res, statusCode, message, errors);
};
