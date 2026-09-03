import { Router, Response, NextFunction } from 'express';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { authenticate, AuthenticatedRequest, requireBuyer } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireBuyer);

/**
 * GET /purchase-history
 * PRD_New V3 §Buyer Purchase History:
 * - Only orders where paymentStatus = PAID (delivered COD orders)
 * - Newest first
 * - Includes lifetime total, per-category breakdown, review status
 * - Pagination (10 per page)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    // Fetch all paid orders for the buyer (need all for the summary stats)
    const allPaidOrders = await Order.find({
      userId: req.user!.id,
      paymentStatus: 'PAID',
    }).sort({ deliveredAt: -1, createdAt: -1 });

    // Enrich each order with product details + review status
    const enrichedItems: any[] = [];
    for (const order of allPaidOrders) {
      for (const item of order.items) {
        const product = await Product.findById(item.productId).select('title slug categoryId images');
        const review = await Review.findOne({ orderId: order._id, productId: item.productId, userId: req.user!.id });
        enrichedItems.push({
          orderId: order._id,
          orderStatus: order.status,
          productId: item.productId,
          productTitle: item.title,
          productSlug: product?.slug || '',
          productImage: product?.images?.find((i) => i.isPrimary)?.url || product?.images?.[0]?.url || '',
          categoryId: product?.categoryId || null,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
          amountPaid: item.priceAtPurchase * item.quantity,
          datePaid: order.deliveredAt || order.createdAt,
          paymentStatus: order.paymentStatus,
          hasReview: !!review,
          reviewId: review?._id || null,
        });
      }
    }

    // Lifetime total
    const lifetimeTotal = enrichedItems.reduce((s, i) => s + i.amountPaid, 0);

    // Per-category breakdown
    const categoryBreakdown: Record<string, { categoryName: string; total: number; count: number }> = {};
    for (const item of enrichedItems) {
      if (!item.categoryId) continue;
      const cat = await Category.findById(item.categoryId).select('name');
      const catId = String(item.categoryId);
      const catName = cat?.name || 'Uncategorized';
      if (!categoryBreakdown[catId]) categoryBreakdown[catId] = { categoryName: catName, total: 0, count: 0 };
      categoryBreakdown[catId].total += item.amountPaid;
      categoryBreakdown[catId].count += 1;
    }

    // Paginate
    const total = enrichedItems.length;
    const paginatedItems = enrichedItems.slice(skip, skip + limit);

    res.json({
      items: paginatedItems,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: {
        lifetimeTotal,
        totalOrders: allPaidOrders.length,
        totalItems: enrichedItems.length,
        categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.total - a.total),
      },
    });
  } catch (e) { next(e); }
});

export default router;
