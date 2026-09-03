# API Documentation

Base URL (development): `http://localhost:5000/api`

All endpoints except `auth/register`, `auth/login`, `auth/admin/login`, `auth/refresh`, public product/category/banner browsing require a valid JWT in the `Authorization: Bearer <token>` header.

Authentication errors return `401` with `{ "error": "..." }`.
Authorization errors return `403` with `{ "error": "Insufficient permissions" }`.
Validation errors return `422` with `{ "error": "Validation failed", "details": [...] }`.

---

## Table of Contents

1. [Auth](#1-auth)
2. [Products (public)](#2-products-public)
3. [Categories (public)](#3-categories-public)
4. [Banners (public)](#4-banners-public)
5. [Cart (buyer)](#5-cart-buyer)
6. [Orders (buyer)](#6-orders-buyer)
7. [COD Requests (buyer)](#7-cod-requests-buyer)
8. [Reviews](#8-reviews)
9. [Wishlist (buyer)](#9-wishlist-buyer)
10. [Notifications (any authenticated)](#10-notifications)
11. [Addresses (buyer)](#11-addresses-buyer)
12. [Admin — Products](#12-admin--products)
13. [Admin — Categories](#13-admin--categories)
14. [Admin — Banners](#14-admin--banners)
15. [Admin — Orders](#15-admin--orders)
16. [Admin — COD Requests](#16-admin--cod-requests)
17. [Admin — Dashboard & Reports](#17-admin--dashboard--reports)
18. [Data Models](#18-data-models)

---

## 1. Auth

### `POST /auth/register`
Create a new **buyer** account. There is no self-service path for sellers.
- **Body**: `{ name: string, email: string, password: string, phone?: string }`
- **Response**: `{ user: AuthUser, accessToken: string }` + sets `refreshToken` HTTP-only cookie.
- **Notes**: Also provisions an empty cart and wishlist for the new user.

### `POST /auth/login`
Login (buyer or admin, but admin should use the dedicated admin login).
- **Body**: `{ email: string, password: string }`
- **Response**: `{ user: AuthUser, accessToken: string }` + sets refresh cookie.
- **Rate-limited**: max `LOGIN_MAX_ATTEMPTS` per `LOGIN_LOCK_MINUTES` window.

### `POST /auth/admin/login`
Non-public admin login (not linked from the storefront UI).
- **Body**: `{ email: string, password: string }`
- **Response**: `{ user: AuthUser, accessToken: string }`
- **Notes**: Returns `401` if the user is not an ADMIN. More aggressively rate-limited.

### `POST /auth/refresh`
Exchange refresh token for a new access token.
- **Body or cookie**: `{ refreshToken?: string }` or the `refreshToken` cookie.
- **Response**: `{ accessToken: string }`

### `POST /auth/logout`
Clear the refresh-token cookie. Client should also discard the access token.

### `GET /auth/me` `[auth]`
Get the current user.
- **Response**: `{ user: AuthUser }` (without `passwordHash`)

### `PATCH /auth/me` `[auth]`
Update profile (name, phone, avatarUrl).
- **Body**: `{ name?: string, phone?: string, avatarUrl?: string }`
- **Response**: `{ user: AuthUser }`

---

## 2. Products (public)

### `GET /products`
List published products with filters and pagination.

**Query params**:
| Param | Type | Description |
|---|---|---|
| `category` | ObjectId | Filter by category |
| `slug` | string | Filter by category slug |
| `search` | string | Full-text search on title, description, tags |
| `minPrice` | number | Minimum base price |
| `maxPrice` | number | Maximum base price |
| `color` | string | Filter by attribute value (color name) |
| `size` | string | Filter by attribute value (size name) |
| `sort` | string | `newest` (default), `price-low`, `price-high`, `popularity`, `rating`, `discount` |
| `inStock` | `true` | Exclude out-of-stock products |
| `page` | number | Page number (1-based, default 1) |
| `limit` | number | Page size (max 48, default 12) |

**Response**: `{ items: Product[], pagination: { page, limit, total, pages } }`

Each `Product` in the response includes computed fields: `effectivePrice`, `discountAmount`, `discountActive`, `totalStock`, `outOfStock`, `primaryImage`.

### `GET /products/featured`
Featured/published products (sorted by `featuredRank`, then `createdAt`).
- **Response**: `{ items: Product[] }`

### `GET /products/:slug`
Get a single product by slug, with populated category and 20 most-recent visible reviews.
- **Response**: `{ product: Product, reviews: Review[] }`

### `GET /products/:slug/similar`
Get up to 6 products in the same category.
- **Response**: `{ items: Product[] }`

### `GET /products/:id/reviews`
All visible (non-hidden) reviews for a product.
- **Response**: `{ items: Review[] }`

---

## 3. Categories (public)

### `GET /categories`
List all active categories, sorted by `sortOrder` then `name`.
- **Response**: `{ items: Category[] }`

---

## 4. Banners (public)

### `GET /banners/active`
Get banners whose schedule window includes "now" (`isActive = true` AND `startAt <= now <= endAt`).
- **Response**: `{ items: Banner[] }`

---

## 5. Cart (buyer)

> All cart routes require `BUYER` role auth.

### `GET /cart`
Get the current user's cart with item details (title, image, price, stock availability).
- **Response**: `{ cart: { _id, items: CartItem[], subtotal, totalItems } }`

### `POST /cart/items`
Add an item to the cart. Updates quantity if the variant is already in the cart.
- **Body**: `{ variantId: string, quantity: number }`
- **Response**: `{ cart: Cart }`
- **Errors**: `400` if out of stock or `quantity > stockQuantity`; `404` if variant not found.

### `PATCH /cart/items/:variantId`
Update quantity of an existing cart item.
- **Body**: `{ quantity: number }`
- **Response**: `{ cart: Cart }`

### `DELETE /cart/items/:variantId`
Remove an item from the cart.

### `DELETE /cart`
Clear the entire cart.

---

## 6. Orders (buyer)

> All order routes require `BUYER` role auth.

### `POST /orders`
Card/wallet checkout — places an order immediately (status `CONFIRMED`, paymentStatus `PAID`). Stock is decremented at this point.
- **Body**: 
  ```json
  {
    "addressId": "string",
    "paymentMethod": "CARD" | "WALLET",
    "items": [{ "variantId": "string", "quantity": 1 }]  // optional — if omitted, uses the cart
  }
  ```
- **Response**: `{ order: Order }` (status 201)
- **Notes**: If `items` is omitted, the order is created from the cart, and the cart is then cleared.

### `GET /orders/me/list`
List the buyer's orders, newest first.
- **Response**: `{ items: Order[] }`

### `GET /orders/:id`
Get a single order (must belong to the requesting buyer).
- **Response**: `{ order: Order }` (with populated address and codRequest)

### `GET /orders/:id/messages`
Get in-order chat messages. Returns empty if the order is not yet `CONFIRMED`.
- **Response**: `{ items: OrderMessage[] }`

### `POST /orders/:id/messages`
Send a buyer-side message in the in-order chat.
- **Body**: `{ message: string }`
- **Response**: `{ message: OrderMessage }` (status 201)
- **Errors**: `400` if chat is locked (order not yet confirmed).

---

## 7. COD Requests (buyer)

> All COD-request routes require `BUYER` role auth.

### `POST /cod-requests`
Start the COD WhatsApp flow. Stock is **held** (decremented immediately as a soft reservation) and a `wa.me` deep link is returned.
- **Body**: 
  ```json
  {
    "addressId": "string",
    "items": [{ "variantId": "string", "quantity": 1 }]  // optional — defaults to cart
  }
  ```
- **Response**: `{ codRequest: CodRequest, waLink: string }` (status 201)
- **Notes**: `waLink` is a `https://wa.me/<number>?text=<encoded message>` URL with the order details pre-filled. The buyer opens WhatsApp, talks to the seller, then calls the next endpoint.

### `PATCH /cod-requests/:id/conversation-done`
Buyer confirms the WhatsApp conversation happened. Moves the request from `AWAITING_CONVERSATION` → `PENDING_SELLER_APPROVAL`. Notifies all admin users.
- **Response**: `{ codRequest: CodRequest }`

### `GET /cod-requests/:id`
Get a single COD request (must belong to the buyer).
- **Response**: `{ codRequest: CodRequest }`

### `GET /cod-requests/me/list`
List the buyer's COD requests, newest first.
- **Response**: `{ items: CodRequest[] }`

---

## 8. Reviews

### `GET /reviews/product/:productId` (public)
List visible reviews for a product.

### `POST /reviews` `[buyer]`
Create a review. Server-side enforced: the referenced `orderId` must belong to the requesting user AND have status `DELIVERED`, and the `productId` must be one of the items in that order.
- **Body**: `{ productId: string, orderId: string, rating: 1-5, comment?: string, photos?: string[] }`
- **Response**: `{ review: Review }` (status 201)
- **Errors**: `400` if order is not `DELIVERED` or product is not in order; `409` if already reviewed.

---

## 9. Wishlist (buyer)

### `GET /wishlist`
List wishlisted products (resolved to full Product objects with computed pricing/stock).
- **Response**: `{ items: Product[] }`

### `POST /wishlist/:productId`
Add a product to the wishlist (idempotent).

### `DELETE /wishlist/:productId`
Remove a product from the wishlist.

---

## 10. Notifications

> All notification routes require any authenticated user.

### `GET /notifications?unread=true`
List notifications for the current user. Use `unread=true` to get only unread ones.
- **Response**: `{ items: Notification[], unreadCount: number }`

### `PATCH /notifications/:id/read`
Mark a single notification as read.

### `PATCH /notifications/read-all`
Mark all unread notifications as read.

---

## 11. Addresses (buyer)

### `GET /addresses` `[buyer]`
List the buyer's saved addresses.

### `POST /addresses` `[buyer]`
Add a new address.
- **Body**: `{ label, fullName, phone, addressLine, city, postalCode?, isDefault? }`
- **Notes**: If `isDefault = true`, all other addresses are un-defaulted.

### `PATCH /addresses/:id` `[buyer]`
Update an address.

### `DELETE /addresses/:id` `[buyer]`
Delete an address.

---

## 12. Admin — Products

> All admin routes require `ADMIN` role auth.

### `GET /admin/products`
List all products (any status) with optional filters.

**Query params**: `search`, `status` (DRAFT/PUBLISHED/ARCHIVED), `category`.

### `GET /admin/products/:id`
Get a single product (any status).

### `POST /admin/products`
Create a product. Multipart form-data with `images[]` files and a `payload` JSON string field.
- **`payload` fields**:
  ```json
  {
    "title": "string",
    "description": "string",
    "categoryId": "ObjectId",
    "brand": "string",
    "basePrice": 1000,
    "discountType": "PERCENT" | "FLAT" | null,
    "discountValue": 10,
    "discountStartAt": "ISO date" | null,
    "discountEndAt": "ISO date" | null,
    "codEligible": true,
    "status": "DRAFT" | "PUBLISHED" | "ARCHIVED",
    "tags": ["string"],
    "weight": 100,
    "attributes": [{ "name": "Color", "isGlobal": true }],
    "attributeValues": [{ "attributeId": "ObjectId", "value": "Red", "displayMeta": "#ff0000" }],
    "variants": [{ "sku": "SKU-1", "stockQuantity": 10, "priceOverride": null, "attributeValues": ["ObjectId"] }],
    "isFeatured": false,
    "featuredRank": null,
    "featuredStartAt": null,
    "featuredEndAt": null
  }
  ```
- **Response**: `{ product: Product }` (status 201)

### `PATCH /admin/products/:id`
Update a product. Same multipart format as POST. Optionally include `existingImages` array in `payload` to keep specific images (otherwise all are kept).

### `PATCH /admin/products/:id/promote`
Set featured flag/rank/schedule.
- **Body**: `{ isFeatured: bool, featuredRank?: number, featuredStartAt?: ISO date, featuredEndAt?: ISO date }`

### `DELETE /admin/products/:id`
Delete a product.

---

## 13. Admin — Categories

### `GET /admin/categories`
List all categories.

### `POST /admin/categories`
Create a category. Multipart with optional `image` file + `payload` JSON.
- **`payload`**: `{ name, parentCategoryId?, sortOrder?, isActive? }`

### `PATCH /admin/categories/:id`
Update a category.

### `DELETE /admin/categories/:id`
Delete a category.

---

## 14. Admin — Banners

### `GET /admin/banners`
List all banners (any schedule status).

### `POST /admin/banners`
Create a banner. Multipart with `image` file + `payload` JSON.
- **`payload`**: `{ title, subtitle?, ctaText?, ctaLink?, startAt, endAt, sortOrder?, isActive? }`

### `PATCH /admin/banners/:id`
Update a banner.

### `DELETE /admin/banners/:id`
Delete a banner.

---

## 15. Admin — Orders

### `GET /admin/orders`
List all orders with filters.
- **Query params**: `status`, `from` (ISO date), `to` (ISO date), `paymentMethod`.

### `GET /admin/orders/:id`
Get a single order (with populated buyer, address, codRequest).

### `PATCH /admin/orders/:id/status`
Update order status. Fires a buyer notification.
- **Body**: `{ status, trackingNumber?, courierName?, rejectionReason? }`
- **Status values**: `CONFIRMED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `RETURNED`.
- **Side effects**:
  - `DELIVERED`: sets `deliveredAt`, marks COD payment as `PAID`.
  - `CANCELLED`: restores held stock back to inventory.

### `GET /admin/orders/:id/messages`
Get chat messages for an order.

### `POST /admin/orders/:id/messages`
Send a seller-side message.

---

## 16. Admin — COD Requests

### `GET /admin/cod-requests?status=PENDING_SELLER_APPROVAL`
List COD requests. Recommended default filter: `PENDING_SELLER_APPROVAL`.

### `GET /admin/cod-requests/:id`
Get a single COD request (with populated buyer, address, linked order).

### `PATCH /admin/cod-requests/:id/accept`
Accept a pending COD request. Creates a real `Order` with status `CONFIRMED`, links it to the request, and notifies the buyer. Stock was already held at request creation; no further stock change happens here.

### `PATCH /admin/cod-requests/:id/reject`
Reject a pending COD request. **Restores held stock** and notifies the buyer.
- **Body**: `{ reason?: string }`

---

## 17. Admin — Dashboard & Reports

### `GET /admin/dashboard/summary`
Aggregate dashboard data: counts (orders by status, products, low-stock products, buyers, pending COD requests), total revenue, 5 recent orders, 5 top-selling products.

### `GET /admin/dashboard/reports/sales?from=&to=`
Sales report by day for the given range (default: last 30 days).
- **Response**: `{ from, to, totalRevenue, totalOrders, byDay: [{ date, revenue, orders }] }`

### `GET /admin/dashboard/reviews`
List all reviews for moderation (newest first, max 100).

### `PATCH /admin/dashboard/reviews/:id`
Moderate a review.
- **Body**: `{ isHidden?: bool, sellerReply?: string }`

---

## 18. Data Models

### `User`
```
{ _id, name, email, phone, passwordHash, role: 'BUYER' | 'ADMIN',
  avatarUrl?, isVerified, failedLoginAttempts, lockUntil?,
  createdAt, updatedAt }
```

### `Address`
```
{ _id, userId, label, fullName, phone, addressLine, city,
  postalCode?, isDefault, createdAt, updatedAt }
```

### `Category`
```
{ _id, name, slug, parentCategoryId?, imageUrl?, sortOrder, isActive,
  createdAt, updatedAt }
```

### `Product`
```
{ _id, title, slug, description, categoryId, brand?, basePrice,
  discountType: 'PERCENT' | 'FLAT' | null, discountValue,
  discountStartAt?, discountEndAt?, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  codEligible, weight?, tags[],
  images: [{ url, sortOrder, isPrimary }],
  attributes: [{ name, isGlobal }],
  attributeValues: [{ attributeId, value, displayMeta? }],
  variants: [{ _id?, sku, stockQuantity, priceOverride?, imageUrl?, attributeValues: [ObjectId] }],
  isFeatured, featuredRank?, featuredStartAt?, featuredEndAt?,
  createdAt, updatedAt }
```

### `Cart`
```
{ _id, userId, items: [{ variantId, productId, quantity }],
  createdAt, updatedAt }
```

### `CodRequest`
```
{ _id, userId, addressId,
  status: 'AWAITING_CONVERSATION' | 'PENDING_SELLER_APPROVAL' | 'ACCEPTED' | 'REJECTED',
  items: [{ variantId, productId, title, variantLabel, quantity, priceAtRequest }],
  subtotal, discountAmount, total,
  rejectionReason?, stockHeldUntil?, orderId?,
  createdAt, decidedAt?, updatedAt }
```

### `Order`
```
{ _id, userId, addressId,
  status: 'CONFIRMED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'RETURNED',
  paymentMethod: 'COD' | 'CARD' | 'WALLET',
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED',
  codRequestId?,
  items: [{ variantId, productId, title, variantLabel, quantity, priceAtPurchase }],
  subtotal, discountAmount, shippingFee, tax, total,
  trackingNumber?, courierName?,
  deliveredAt?, cancelledAt?,
  createdAt, updatedAt }
```

### `OrderMessage`
```
{ _id, orderId, senderRole: 'BUYER' | 'SELLER', senderId, message,
  readAt?, createdAt, updatedAt }
```

### `Notification`
```
{ _id, userId, type, orderId?, title, body, isRead, createdAt, updatedAt }
/* type ∈ { ORDER_ACCEPTED, ORDER_REJECTED, ORDER_SHIPPED, ORDER_OUT_FOR_DELIVERY,
            ORDER_DELIVERED, ORDER_CANCELLED, NEW_COD_REQUEST, NEW_REVIEW, GENERIC } */
```

### `Banner`
```
{ _id, imageUrl, title, subtitle?, ctaText?, ctaLink?,
  startAt, endAt, sortOrder, isActive, createdAt, updatedAt }
```

### `Review`
```
{ _id, productId, orderId, userId, rating: 1-5, comment,
  photos: [url], isVerifiedPurchase, sellerReply?, isHidden,
  createdAt, updatedAt }
```

### `Wishlist`
```
{ _id, userId, productIds: [ObjectId], createdAt, updatedAt }
```

---

## Configuration Reference

The backend reads its configuration from environment variables via `backend/src/config/env.ts`. See `backend/.env.example` for the full list and `prerequisites.md` for what each variable does.

The frontend reads `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SELLER_WHATSAPP_NUMBER` from `frontend/.env`.
