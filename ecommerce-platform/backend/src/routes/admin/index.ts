import { Router } from 'express';
import productsRouter from './products';
import categoriesRouter from './categories';
import bannersRouter from './banners';
import ordersRouter from './orders';
import codRequestsRouter from './codRequests';
import dashboardRouter from './dashboard';

const router = Router();

router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/banners', bannersRouter);
router.use('/orders', ordersRouter);
router.use('/cod-requests', codRequestsRouter);
router.use('/dashboard', dashboardRouter);
// /admin/reviews is handled under dashboard for brevity

export default router;
