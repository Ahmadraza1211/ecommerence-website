import mongoose from 'mongoose';
import { Product, IProduct, IVariant } from '../models/Product';
import { Order } from '../models/Order';
import { CodRequest } from '../models/CodRequest';
import { pushNotification } from './notificationService';

type VariantRef = string | mongoose.Types.ObjectId;

/**
 * PRD_New §My Orders.4 (COD stock logic):
 * Stock is only decremented when the seller ACCEPTS a COD request.
 * This function is called from PATCH /admin/cod-requests/:id/accept.
 */
export async function decrementStockOnAccept(items: { variantId: VariantRef; quantity: number }[]): Promise<void> {
  for (const item of items) {
    const variantId = typeof item.variantId === 'string' ? new mongoose.Types.ObjectId(item.variantId) : item.variantId;
    const product = await Product.findOne({ 'variants._id': variantId });
    if (!product) continue;
    const variant = product.variants.find((v) => v._id?.equals(variantId)) as IVariant | undefined;
    if (!variant) continue;
    const newStock = Math.max(0, (variant.stockQuantity || 0) - item.quantity);
    await Product.updateOne(
      { _id: product._id, 'variants._id': variantId },
      { $set: { 'variants.$.stockQuantity': newStock } }
    );
  }
}

/**
 * PRD_New §My Orders.4 (edge case): When accepting a COD request would bring stock to 0
 * (or below what other pending requests need), auto-reject the other pending requests
 * for the same variant and notify those buyers.
 *
 * Returns the list of auto-rejected request IDs (with their buyer IDs) so the caller
 * can fire notifications.
 */
export async function autoRejectCompetingRequests(acceptedRequest: any): Promise<Array<{ requestId: string; userId: string; reason: string }>> {
  const rejected: Array<{ requestId: string; userId: string; reason: string }> = [];
  // For each item in the accepted request, find other pending requests for the same variant
  for (const item of acceptedRequest.items) {
    const variantId = item.variantId;
    const product = await Product.findOne({ 'variants._id': variantId });
    if (!product) continue;
    const variant = product.variants.find((v) => v._id?.equals(variantId)) as IVariant | undefined;
    if (!variant) continue;
    const remainingStock = variant.stockQuantity; // already decremented by decrementStockOnAccept

    // Find other pending requests that include this variant
    const others = await CodRequest.find({
      _id: { $ne: acceptedRequest._id },
      status: { $in: ['AWAITING_CONVERSATION', 'PENDING_SELLER_APPROVAL'] },
      'items.variantId': variantId,
    });

    // Sort others by creation time (first-come-first-served for any remaining stock)
    others.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    let available = remainingStock;
    for (const other of others) {
      const otherQtyForVariant = other.items
        .filter((i) => String(i.variantId) === String(variantId))
        .reduce((s, i) => s + i.quantity, 0);

      if (available >= otherQtyForVariant) {
        // This request can still be fulfilled later — leave it pending.
        available -= otherQtyForVariant;
        continue;
      }

      // Not enough stock for this request → auto-reject it
      other.status = 'REJECTED';
      other.rejectionReason = 'Item sold out before your request could be accepted';
      other.decidedAt = new Date();
      await other.save();
      rejected.push({
        requestId: String(other._id),
        userId: String(other.userId),
        reason: 'Item sold out before your request could be accepted',
      });
    }
  }
  return rejected;
}

/**
 * When an order is CANCELLED (after being confirmed), restore the stock.
 */
export async function restoreStockOnCancel(orderId: string): Promise<void> {
  const order = await Order.findById(orderId);
  if (!order) return;
  for (const item of order.items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;
    const variant = product.variants.find((v) => v._id?.equals(item.variantId)) as IVariant | undefined;
    if (!variant) continue;
    const restored = (variant.stockQuantity || 0) + item.quantity;
    await Product.updateOne(
      { _id: product._id, 'variants._id': item.variantId },
      { $set: { 'variants.$.stockQuantity': restored } }
    );
  }
}

/**
 * Helper: total quantity of a variant currently held in pending (not-yet-accepted) COD requests.
 * Used by cart endpoints to prevent overselling.
 */
export async function totalPendingCodQuantity(variantId: VariantRef): Promise<number> {
  const id = typeof variantId === 'string' ? new mongoose.Types.ObjectId(variantId) : variantId;
  const requests = await CodRequest.find({
    status: { $in: ['AWAITING_CONVERSATION', 'PENDING_SELLER_APPROVAL'] },
    'items.variantId': id,
  });
  let total = 0;
  for (const r of requests) {
    for (const it of r.items) {
      if (String(it.variantId) === String(id)) total += it.quantity;
    }
  }
  return total;
}
