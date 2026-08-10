import { Request, Response } from 'express';
import Order from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Banner } from '../models/Banner';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/responseHandler';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const [
    totalOrders,
    recentOrders,
    totalProducts,
    totalCustomers,
    totalCategories,
    totalBanners,
    revenueResult,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(5),
    Product.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Category.countDocuments(),
    Banner.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
  ]);

  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

  successResponse(res, 200, 'Dashboard stats fetched', {
    totalRevenue,
    totalOrders,
    totalProducts,
    totalCategories,
    totalBanners,
    totalCustomers,
    recentOrders,
  });
});
