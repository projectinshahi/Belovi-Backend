import express from 'express';
import { getAddresses, addAddress, deleteAddress, editAddress, getAllCustomers, toggleCustomerStatus, updateProfile, getProfile } from '../controllers/userController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { validate, schemas } from '../middlewares/validation';

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, validate(schemas.updateProfile), updateProfile);

router.route('/addresses')
  .get(protect, getAddresses)
  .post(protect, validate(schemas.addAddress), addAddress);

router.route('/addresses/:addressId')
  .put(protect, validate(schemas.addAddress), editAddress)
  .delete(protect, deleteAddress);

// Admin routes
router.get('/admin/customers', protect, authorize('admin', 'superadmin'), getAllCustomers);
router.put('/admin/customers/:id/toggle-status', protect, authorize('admin', 'superadmin'), toggleCustomerStatus);

export default router;
