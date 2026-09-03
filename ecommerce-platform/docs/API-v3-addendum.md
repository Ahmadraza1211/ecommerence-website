# API Documentation — V3 Addendum

This document lists **only the new and changed API endpoints** introduced by the V3 patch (batch 3 requirements). All endpoints from the original `docs/API.md` and `docs/API-addendum.md` remain unless explicitly noted.

---

## New Endpoints

### `GET /purchase-history` `[buyer]`
PRD_New V3 §Buyer Purchase History — returns completed, paid orders only.

**Query**: `?page=1` (10 items per page)

**Response**:
```json
{
  "items": [
    {
      "orderId": "...",
      "productTitle": "CloudSoft Fleece Hoodie",
      "productSlug": "cloudsoft-fleece-hoodie",
      "productImage": "https://...",
      "quantity": 1,
      "amountPaid": 2990,
      "datePaid": "2026-09-01T...",
      "paymentStatus": "PAID",
      "hasReview": true,
      "reviewId": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 3, "pages": 1 },
  "summary": {
    "lifetimeTotal": 16573,
    "totalOrders": 2,
    "totalItems": 3,
    "categoryBreakdown": [
      { "categoryName": "Men's Clothing", "total": 2990, "count": 1 },
      { "categoryName": "Audio", "total": 13583, "count": 2 }
    ]
  }
}
```

### `POST /cart/apply-bundle` `[buyer]`
PRD_New V3 §Banner Bundle Deal — applies a banner's bundle deal to the cart.

**Body**: `{ "bannerId": "...", "tierIndex": 0, "variantId": "..." }`

**Behavior**:
- Validates the banner is active and within its schedule window.
- Validates the variant has enough stock for the deal's required quantity.
- Removes any existing bundle deal items from the cart (one deal per checkout).
- Adds the item with `isBundleDeal: true`, `bundlePrice` = `unitPrice × quantity × (1 − discount%)`, and a locked quantity.

**Response**: `{ "cart": Cart }`

**Errors**:
- `404` — banner not found or inactive
- `400` — deal expired, insufficient stock, or invalid tier

### `PATCH /admin/cod-requests/:id/items/:variantId` `[admin]`
PRD_New V3 §Particular Order.5 — seller adjusts quantity on a COD request.

**Body**: `{ "quantity": 2 }`

**Validation**: quantity must be ≥ 1 and ≤ the variant's available stock.

**Response**: `{ "codRequest": CodRequest }`

### `GET /admin/orders/:id` — now includes events
The order detail endpoint now returns an `events` array (the order's activity log, newest first):
```json
{
  "order": { ... },
  "events": [
    { "_id": "...", "type": "ORDER_DELIVERED", "message": "Order marked as Delivered", "createdAt": "..." },
    { "_id": "...", "type": "ORDER_SHIPPED", "message": "Order marked as Shipped by seller", "createdAt": "..." },
    ...
  ]
}
```

### `GET /orders/:id` — buyer side, now includes events
Same as above — returns `{ order, events }`.

---

## Changed Endpoints

### `GET /admin/orders` — now accepts `categoryId`
**New query param**: `categoryId` — filters orders that contain items in the specified category (resolves via `items.productId → Product.categoryId`). This makes the category sidebar functional.

### `GET /cart` — now returns `pendingCodRequests`
Response now includes pending COD requests so the cart page can show the "Waiting: COD Request" status:
```json
{
  "cart": { ... },
  "pendingCodRequests": [ { ...codRequest } ]
}
```

### `PATCH /admin/orders/:id/status` — now logs events
Every status change now creates an `OrderEvent` entry with the actor's role and a human-readable message.

### `POST /admin/orders/:id/messages` and `POST /orders/:id/messages`
Both now log a `MESSAGE_SENT` event to the order's activity log.

### `POST /admin/banners` and `PATCH /admin/banners/:id`
Now accept `bundleTiers: [{ quantity, discountPercent }]` — an array of deal tiers. Also accept `autoStart: boolean` — when true, `startAt` is set to "now" and a past manual start is treated as "now".

### `GET /banners/active` — enriched
Each banner now includes `hasBundleDeal: boolean` and `timeRemainingMs: number` (milliseconds until the banner expires, for countdown display).

---

## New Schema: `OrderEvent`

```
{
  _id: ObjectId,
  orderId: ObjectId,         // ref: Order
  type: string,              // COD_REQUEST_CREATED | COD_REQUEST_ACCEPTED | ... | MESSAGE_SENT
  actorRole: string,         // BUYER | SELLER | SYSTEM
  actorId: ObjectId | null,  // ref: User
  message: string,           // human-readable description
  metadata: mixed,           // optional extra data
  createdAt: Date
}
```

Indexed on `{ orderId: 1, createdAt: -1 }` for efficient newest-first queries.

---

## Schema Changes

### `Banner` — new `bundleTiers` field
```diff
+ bundleTiers: [{ quantity: number, discountPercent: number }]
```

### `Cart` items — new bundle deal fields
```diff
  items: [{
    variantId, productId, quantity,
+   isBundleDeal?: boolean,
+   bundlePrice?: number,
+   bundleBannerId?: ObjectId | null
  }]
```

---

## Auth Changes (V3)

### Clock skew buffer
The frontend `isAuthenticated()` now allows a **60-second grace period** after the access token expires. This prevents mid-session logouts caused by timing issues where the token expires "right now" but the user is actively clicking.

### Refresh on any 401
The API interceptor now attempts a token refresh on **any** 401 response (not just `TOKEN_EXPIRED`), making the session more resilient to transient auth issues.

### Skip login page when authenticated
Both `/login` and `/admin/login` pages now check the auth store on mount:
- If a valid session exists for the **same role**, redirect to the dashboard/marketplace.
- If a valid session exists for a **different role**, redirect with a toast message telling the user to sign out first.
