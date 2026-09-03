import { IProduct, IVariant } from '../models/Product';

/**
 * Compute the current effective price for a product, applying any active discount.
 * If discountType is null or no active discount window, returns basePrice.
 */
export function computeEffectivePrice(product: { basePrice: number; discountType: string | null; discountValue: number; discountStartAt?: Date | null; discountEndAt?: Date | null }): { effectivePrice: number; discountAmount: number; discountActive: boolean } {
  const now = new Date();
  let discountActive = false;
  if (product.discountType) {
    const startOk = !product.discountStartAt || product.discountStartAt <= now;
    const endOk = !product.discountEndAt || product.discountEndAt >= now;
    discountActive = startOk && endOk && product.discountValue > 0;
  }
  if (!discountActive) {
    return { effectivePrice: product.basePrice, discountAmount: 0, discountActive: false };
  }
  let discountAmount = 0;
  if (product.discountType === 'PERCENT') {
    discountAmount = Math.round((product.basePrice * product.discountValue) / 100);
  } else if (product.discountType === 'FLAT') {
    discountAmount = Math.min(product.basePrice, product.discountValue);
  }
  return {
    effectivePrice: Math.max(0, product.basePrice - discountAmount),
    discountAmount,
    discountActive: true,
  };
}

export function variantEffectivePrice(product: IProduct, variant: IVariant): { effectivePrice: number; discountAmount: number } {
  const base = variant.priceOverride != null ? variant.priceOverride : product.basePrice;
  const { effectivePrice, discountAmount } = computeEffectivePrice({
    basePrice: base,
    discountType: product.discountType,
    discountValue: product.discountValue,
    discountStartAt: product.discountStartAt,
    discountEndAt: product.discountEndAt,
  });
  // discountAmount for variant uses the variant's base
  const ratio = base > 0 ? effectivePrice / base : 1;
  return { effectivePrice, discountAmount: Math.round(base * (1 - ratio)) };
}

/**
 * Total stock across all variants (or product.baseStock if no variants).
 */
export function productTotalStock(product: IProduct): number {
  if (!product.variants || product.variants.length === 0) return 0;
  return product.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
}

export function isProductOutOfStock(product: IProduct): boolean {
  return productTotalStock(product) <= 0;
}

/**
 * Build a readable label for a variant, e.g. "Red / XL".
 * Returns '' if no attribute values are linked.
 */
export function buildVariantLabel(variant: IVariant, valueMap: Map<string, string>): string {
  return variant.attributeValues.map((av) => valueMap.get(String(av)) || '').filter(Boolean).join(' / ');
}
