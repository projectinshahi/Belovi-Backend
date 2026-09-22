import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import bannerRoutes from './bannerRoutes';
import userRoutes from './userRoutes';
import paymentRoutes from './paymentRoutes';
import cartRoutes from './cartRoutes';
import dashboardRoutes from './dashboardRoutes';
import faqRoutes from './faqRoutes';
import newsletterRoutes from './newsletterRoutes';
import storyRoutes from './storyRoutes';
import featuredCollectionRoutes from './featuredCollectionRoutes';
import founderNoteRoutes from './founderNoteRoutes';
import studioNoteRoutes from './studioNoteRoutes';
import categorySectionRoutes from './categorySectionRoutes';
import editSectionRoutes from './editSectionRoutes';
import siteSettingsRoutes from './siteSettingsRoutes';
import aboutRoutes from './aboutRoutes';
import brochureRoutes from './brochureRoutes';
import videoRoutes from './videoRoutes';
import collectionSectionRoutes from './collectionSectionRoutes';

const router = Router();

// Health Check
router.get('/health', checkHealth);

// Mount other routes here
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);
router.use('/users', userRoutes);
router.use('/payments', paymentRoutes);
router.use('/cart', cartRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/faqs', faqRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/story', storyRoutes);
router.use('/featured-collection', featuredCollectionRoutes);
router.use('/founder-note', founderNoteRoutes);
router.use('/studio-note', studioNoteRoutes);
router.use('/category-section', categorySectionRoutes);
router.use('/edit-sections', editSectionRoutes);
router.use('/site-settings', siteSettingsRoutes);
router.use('/about', aboutRoutes);
router.use('/brochures', brochureRoutes);
router.use('/videos', videoRoutes);
router.use('/collection-section', collectionSectionRoutes);

export default router;
