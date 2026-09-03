import { Router, Response, NextFunction } from 'express';
import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { Review } from '../../models/Review';
import { User } from '../../models/User';
import { CodRequest } from '../../models/CodRequest';
import { Category } from '../../models/Category';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

/**
 * GET /admin/dashboard/summary
 * PRD_New §Seller Dashboard:
 * - Top Selling shows product image alongside stats
 * - Recent Orders shows Product Name, not raw Product ID
 */
router.get('/summary', async (_req, res: Response, next: NextFunction) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      lowStockProducts,
      pendingCodRequests,
      recentOrders,
      topProductsAgg,
      revenueAgg,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'CONFIRMED' }),
      Order.countDocuments({ status: { $in: ['SHIPPED', 'OUT_FOR_DELIVERY'] } }),
      Order.countDocuments({ status: 'DELIVERED' }),
      Order.countDocuments({ status: 'CANCELLED' }),
      Product.countDocuments({ status: { $ne: 'ARCHIVED' } }),
      Product.countDocuments({ 'variants.stockQuantity': { $lte: 5 } }),
      CodRequest.countDocuments({ status: 'PENDING_SELLER_APPROVAL' }),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name email'),
      Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', totalSold: { $sum: '$items.quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    // PRD_New: top products include image
    const topProductIds = topProductsAgg.map((p) => p._id);
    const topProductDocs = await Product.find({ _id: { $in: topProductIds } }).select('title slug images basePrice');
    const topProducts = topProductsAgg.map((agg) => {
      const doc = topProductDocs.find((d) => String(d._id) === String(agg._id));
      return {
        product: doc ? {
          _id: doc._id,
          title: doc.title,
          slug: doc.slug,
          basePrice: doc.basePrice,
          image: doc.images?.find((i: any) => i.isPrimary)?.url || doc.images?.[0]?.url || '',
        } : null,
        totalSold: agg.totalSold,
      };
    });

    // PRD_New: recent orders include product name (not ID)
    const recentOrdersEnriched = recentOrders.map((o: any) => ({
      ...o.toObject(),
      productName: o.items?.[0]?.title || (o.items?.length > 1 ? `${o.items?.[0]?.title} +${o.items.length - 1} more` : '—'),
    }));

    // PRD_New §Platform-Wide.4: don't show buyer counts by default
    res.json({
      counts: {
        orders: totalOrders,
        pending: pendingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        products: totalProducts,
        lowStock: lowStockProducts,
        pendingCodRequests,
      },
      revenue: revenueAgg[0]?.total || 0,
      recentOrders: recentOrdersEnriched,
      topProducts,
    });
  } catch (e) { next(e); }
});

// GET /admin/reports/sales?from=&to=
router.get('/reports/sales', async (req, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const orders = await Order.find({
      createdAt: { $gte: from, $lte: to },
      status: { $ne: 'CANCELLED' },
    }).sort({ createdAt: 1 });
    const byDay: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      byDay[key] = byDay[key] || { date: key, revenue: 0, orders: 0 };
      byDay[key].revenue += o.total;
      byDay[key].orders += 1;
    }
    res.json({
      from,
      to,
      totalRevenue: orders.reduce((s, o) => s + o.total, 0),
      totalOrders: orders.length,
      byDay: Object.values(byDay),
    });
  } catch (e) { next(e); }
});

/**
 * GET /admin/dashboard/reviews
 * PRD_New §Seller Review: group by category, sortable by time
 */
router.get('/reviews', async (req, res: Response, next: NextFunction) => {
  try {
    const sort = req.query.sort === 'time' ? { createdAt: -1 as const } : { createdAt: -1 as const };
    const items = await Review.find().sort(sort).limit(100)
      .populate('userId', 'name')
      .populate({ path: 'productId', select: 'title categoryId', populate: { path: 'categoryId', select: 'name slug' } });

    // Group by category
    const groups: Record<string, any> = {};
    for (const r of items as any[]) {
      const cat = r.productId?.categoryId;
      const catName = cat?.name || 'Uncategorized';
      const catId = cat?._id ? String(cat._id) : 'uncategorized';
      if (!groups[catId]) groups[catId] = { categoryId: catId, categoryName: catName, reviews: [] };
      groups[catId].reviews.push(r);
    }
    res.json({ items, groups: Object.values(groups) });
  } catch (e) { next(e); }
});

// PATCH /admin/reviews/:id — moderate
router.patch('/reviews/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const { isHidden, sellerReply } = req.body;
    const update: any = {};
    if (isHidden !== undefined) update.isHidden = isHidden;
    if (sellerReply !== undefined) update.sellerReply = sellerReply;
    const review = await Review.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    res.json({ review });
  } catch (e) { next(e); }
});

export default router;
