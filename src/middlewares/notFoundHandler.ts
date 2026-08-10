import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/responseHandler';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  errorResponse(res, 404, `Route not found - ${req.originalUrl}`);
};
