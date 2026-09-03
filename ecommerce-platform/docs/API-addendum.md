# API Documentation — Addendum (PRD_New changes)

This document lists **only the API changes** introduced by the PRD_New patch. All endpoints not listed here remain unchanged from the original `docs/API.md`. Drop this file next to the original `docs/API.md`.

---

## Changed Endpoints

### `POST /auth/login` — now role-restricted
Previously accepted any valid credentials. Now **rejects ADMIN credentials** with `403`:
```json
{ "error": "Please use the admin login page for seller accounts" }
```
BUYER-only. Admin must use `POST /auth/admin/login`.

### `POST /orders` — removed (COD only)
Previously placed card/wallet orders. Now always returns `400`:
```json
{
  "error": "Card and wallet payments are no longer supported. Please use the COD (Cash on Delivery) checkout flow.",
  "code": "COD_ONLY"
}
```

### `POST /cod-requests` — stock no longer held at creation
Previously decremented stock immediately as a soft-hold. Now **does not touch stock** — stock is only decremented when the seller accepts (see `PATCH /admin/cod-requests/:id/accept` below). The response shape is unchanged.

### `PATCH /admin/orders/:id/status` — new validation rules
- **Removed** `trackingNumber` and `courierName` from the body (the fields are deprecated and ignored).
- **New rule**: `status = DELIVERED` is rejected (`400`) unless the order is already `SHIPPED` or `OUT_FOR_DELIVERY`:
  ```json
  { "error": "An order must be Shipped before it can be marked Delivered" }
  ```
- **New rule**: `status = SHIPPED` is rejected unless the order is `CONFIRMED`.

### `PATCH /admin/cod-requests/:id/accept` — new stock logic + auto-reject
- Now **decrements stock** at acceptance (not at request creation).
- Verifies stock is still available before accepting — returns `400` if insufficient:
  ```json
  { "error": "Cannot accept — \"AuraBeat Pro Wireless Earbuds\" only has 1 in stock but the buyer requested 2." }
  ```
- **Auto-rejects competing pending requests** for the same variant if stock runs out, and notifies each auto-rejected buyer with:
  ```
  Your COD request was automatically rejected because the item sold out before it could be accepted.
  ```
- Response now includes `autoRejectedCount`:
  ```json
  { "codRequest": {...}, "order": {...}, "autoRejectedCount": 1 }
  ```

### `GET /products` — fixed category filter
The `?category=<slug>` query param now correctly resolves the slug to a category ObjectId and includes products from all its subcategories. Previously it passed the slug directly as an ObjectId and returned no results.

New optional `?subcategory=<slug>` param for finer filtering.

### `GET /admin/products` — new response fields + filters
- Response now includes `total` (total product count) and `outOfStock` (count of products with all variants at 0 stock).
- New optional `?category=<slug>` query param — resolves slug to ObjectId and includes subcategories.

### `GET /admin/orders` — major changes
**New query params**:
- `timeRange` — `today` | `7d` | `30d` | `all` (default: `all`)
- `limit` — default is now `5` (PRD_New: show 5 most recent by default)
- `page` — pagination

**New response shape**:
```json
{
  "items": [
    {
      "...order fields...",
      "productName": "AuraBeat Pro Wireless Earbuds +1 more",
      "itemCount": 2,
      "unreadCount": 1
    }
  ],
  "groupedByBuyer": [
    { "buyer": { "_id": "...", "name": "Ayesha Khan", "email": "...", "phone": "..." }, "orders": [...] }
  ],
  "pagination": { "page": 1, "limit": 5, "total": 12, "pages": 3 },
  "statusCounts": { "CONFIRMED": 2, "SHIPPED": 1, "OUT_FOR_DELIVERY": 0, "DELIVERED": 8, "CANCELLED": 1 }
}
```

**Removed**: `paymentMethod` filter (COD is the only method now).

### `GET /admin/orders/:id/messages` — marks messages read
Now atomically marks all `senderRole: 'BUYER'` messages as `readBySeller: true` when the seller opens the conversation. This is what decrements the unread badge.

### `POST /admin/orders/:id/messages` — chat closed for delivered orders
Returns `400` if the order status is `DELIVERED`, `CANCELLED`, or `RETURNED`:
```json
{ "error": "Chat is closed for this order" }
```

### `GET /orders/:id/messages` — buyer side, marks messages read
Now marks all `senderRole: 'SELLER'` messages as `readByBuyer: true` when the buyer opens the conversation.

### `POST /orders/:id/messages` — chat closed for delivered orders
Same rule as the seller side — returns `400` if order is `DELIVERED` / `CANCELLED` / `RETURNED`.

### `GET /orders/me/list` — now includes unread count
Each order in the response now has an `unreadCount` field (number of unread seller messages):
```json
{ "items": [ { "...order fields...", "unreadCount": 1 } ] }
```

### `POST /admin/products` — ObjectId bug fixed
The previous version failed with `"input must be a 24 character hex string"` because temp string IDs were being passed to `mongoose.Types.ObjectId()`. Now the backend generates proper ObjectIds for all attributes and values before constructing the product document.

**Removed fields** (no longer in the payload, ignored if sent): `codEligible`, `weight`, `tags`.
**New field**: `material` (string).
**Validation**: `discountEndAt` must be after `discountStartAt` — returns `400` with a plain-language error otherwise.
**Error handling**: all technical errors are now caught and returned as plain-language messages. Raw `"hex string"` / `"ObjectId"` errors never leak to the UI.

### `POST /admin/banners` — guided CTA flow
**Removed**: `ctaText` (free-text) — kept in schema for backward compat but always empty.
**New fields**:
- `ctaCategory` (ObjectId, optional) — the category to link to
- `ctaProduct` (ObjectId, optional) — the specific product to link to (overrides category)
- `dealQuantity` (number, optional) — special-deal quantity (e.g. "2 for" offers)
- `dealDiscountPercent` (number, optional) — percent discount to display

The `ctaLink` is auto-derived from `ctaProduct` / `ctaCategory` on the server.

**New validation**: `endAt` must be after `startAt`.

### `GET /admin/banners` — default sort = "Last"
Now returns banners sorted by `createdAt DESC` (most recently added first). The `sortOrder` field is kept in the schema for backward compat but is no longer used for default ordering.

### `GET /admin/dashboard/summary` — enriched
- `topProducts` now includes a `product.image` field (primary image URL) alongside `title` / `slug` / `totalSold`.
- `recentOrders` now includes a `productName` field (first item's title, truncated with "+N more" if multiple items).
- **Removed**: `counts.buyers` (PRD-New: don't show buyer counts by default).

### `GET /admin/dashboard/reviews` — grouped by category
Response now includes a `groups` array:
```json
{
  "items": [...all reviews...],
  "groups": [
    { "categoryId": "...", "categoryName": "Electronics", "reviews": [...] },
    { "categoryId": "...", "categoryName": "Fashion", "reviews": [...] }
  ]
}
```

---

## New Endpoints

### `GET /categories/tree` (public)
Returns the full category tree in one call — top-level categories with their subcategories nested:
```json
{
  "items": [
    {
      "_id": "...", "name": "Electronics", "slug": "electronics",
      "subcategories": [
        { "_id": "...", "name": "Audio", "slug": "audio", "parentCategoryId": "..." },
        { "_id": "...", "name": "Wearables", "slug": "wearables", "parentCategoryId": "..." }
      ]
    }
  ]
}
```

### `GET /categories/:id/subcategories` (public)
Returns the direct subcategories of a given parent category ID.

### `GET /cart/validate-stock` `[buyer]`
Pre-checkout stock re-verification. Returns whether the cart is still valid and a list of issues:
```json
{
  "valid": false,
  "reason": "Some items in your cart are no longer available in the requested quantity",
  "items": [
    { "variantId": "...", "issue": "Out of stock", "productTitle": "...", "available": 0 },
    { "variantId": "...", "issue": "Insufficient stock", "productTitle": "...", "available": 2, "requested": 5 }
  ]
}
```

### `GET /admin/orders/unread-summary/overview` `[admin]`
Returns total unread order-message counts grouped by category — used by the seller's category sidebar:
```json
{
  "categoryUnread": {
    "<categoryId>": 3,
    "<categoryId>": 1
  },
  "totalUnreadOrders": 4
}
```

### `GET /admin/products/:id/cod-pending` `[admin]`
Returns pending COD requests that include the given product — used to show the "COD · Pending" label on the admin product card:
```json
{ "items": [ { "...cod request fields..." } ] }
```

### `GET /reviews/grouped` (public)
Returns all visible reviews grouped by category. Same shape as `GET /admin/dashboard/reviews` `groups` field but without the admin-only fields.

---

## Schema Changes

### `OrderMessage` — new fields
```diff
+ readByBuyer: boolean   // has the buyer seen this message?
+ readBySeller: boolean  // has the seller seen this message?
```
The old `readAt` field is kept for backward compat but is no longer used by the new unread-count logic.

New compound indexes:
- `{ orderId: 1, senderRole: 1, readByBuyer: 1 }`
- `{ orderId: 1, senderRole: 1, readBySeller: 1 }`

### `Product` — new field
```diff
+ material?: string
```
`codEligible`, `weight`, and `tags` are kept in the schema for backward compat but are no longer required or surfaced in the admin UI.

### `Banner` — new fields
```diff
+ ctaCategory?: ObjectId | null
+ ctaProduct?: ObjectId | null
+ dealQuantity?: number | null
+ dealDiscountPercent?: number | null
```
`ctaText` is kept but always empty going forward.

### `Category` — no schema change
The `parentCategoryId` field already existed — it's now properly used for subcategories. A new index on `parentCategoryId` is created by the seed script.

### `Order` — deprecated fields
`trackingNumber` and `courierName` are kept in the schema for backward compat with existing seed data, but are no longer set by the admin UI or returned in the order detail view.

---

## Auth Changes

### JWT expiry is now strictly enforced
The `authenticate` middleware now:
1. Decodes the JWT and checks the `exp` claim.
2. If expired, returns `401` with `{ "error": "Token expired", "code": "TOKEN_EXPIRED" }`.
3. If invalid, returns `401` with `{ "error": "Invalid token", "code": "TOKEN_INVALID" }`.
4. Re-loads the user from DB on every request — if the user was deleted or their role changed, returns `401` with `code: USER_GONE` or `ROLE_CHANGED`.

### Refresh-token flow
The frontend `api.ts` interceptor now:
- On `401 TOKEN_EXPIRED`, attempts ONE refresh via `POST /auth/refresh`.
- If the refresh succeeds, retries the original request with the new token.
- If the refresh fails, clears the access token and redirects to the appropriate login page (`/login` for buyers, `/admin/login` for admins).

### Auth store
The frontend `authStore` now:
- Decodes the JWT `exp` on login and stores `accessTokenExpiresAt`.
- `isAuthenticated()` returns `false` if the token has expired — preventing stale sessions from being used.
- On app load, if the token is expired, the user is treated as logged-out.
