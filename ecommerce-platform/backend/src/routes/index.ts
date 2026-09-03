import { Router } from 'express';
import authRouter from './auth';
import productsRouter from './products';
import categoriesRouter from './categories';
import bannersRouter from './banners';
import cartRouter from './cart';
import ordersRouter from './orders';
import codRequestsRouter from './codRequests';
import reviewsRouter from './reviews';
import wishlistRouter from './wishlist';
import notificationsRouter from './notifications';
import addressesRouter from './addresses';
import purchaseHistoryRouter from './purchaseHistory';
import adminRouter from './admin';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

router.use('/auth', authRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/banners', bannersRouter);
router.use('/cart', cartRouter);
router.use('/orders', ordersRouter);
router.use('/cod-requests', codRequestsRouter);
router.use('/reviews', reviewsRouter);
router.use('/wishlist', wishlistRouter);
router.use('/notifications', notificationsRouter);
router.use('/addresses', addressesRouter);
// PRD_New V3 §Buyer Purchase History
router.use('/purchase-history', purchaseHistoryRouter);
router.use('/admin', adminRouter);

export default router;
