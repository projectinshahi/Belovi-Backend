import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/responseHandler';

export const checkHealth = asyncHandler(async (req: Request, res: Response) => {
  successResponse(res, 200, 'BELOVI API is up and running!', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
