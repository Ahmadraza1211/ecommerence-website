# Implementation Plan
## Single-Seller E-Commerce Marketplace Platform

*Companion document to `prd.md`. This defines the technical architecture, data model, build phases, and timeline.*

---

## 1. Recommended Tech Stack

| Layer | Recommendation | Notes |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript** | SSR/SSG for SEO on product & category pages; great DX |
| Styling | **Tailwind CSS** + a component library (shadcn/ui or Radix primitives) | Fast, consistent design system for strong UI/UX |
| State management | React Query (server state) + Zustand or Context (cart/UI state) | Keep client state minimal, server is source of truth |
| Backend | **Node.js (NestJS or Express) with TypeScript** | REST or GraphQL API; NestJS gives structure for a growing admin panel |
| Database | **MongoDB** | Relational integrity fits orders/inventory/variants well |
| ORM | **Prisma** | Type-safe schema, easy migrations |
| Auth | JWT (access + refresh tokens), bcrypt/argon2 for password hashing | Consider NextAuth.js if using Next.js full-stack |
| File/Image storage | **Cloudinary** 
| Hosting | **Vercel** (frontend) + **Railway/Render/AWS** (backend + DB) | Or a single VPS with Docker if budget-constrained |
| Search | PostgreSQL full-text search (v1) → Algolia/Meilisearch (if catalog grows large) | Start simple, upgrade if needed |
| Admin Panel | Built as protected routes within the same Next.js app (`/admin/*`) | Shared codebase, role-gated |

> **Alternative lightweight stack** (if the team prefers simplicity/monolith): Laravel (PHP) or Django (Python) with server-rendered templates + Alpine.js/HTMX for interactivity, and their built-in admin (Django Admin) customized. Recommended if the team already knows PHP/Python well. The plan below assumes the Node/Next.js stack but the data model applies either way.

---

## 2. High-Level Architecture

```
                        ┌─────────────────────────┐
                        │      Next.js App        │
                        │  (Storefront + Admin)    │
                        │  SSR/SSG + Client React  │
                        └────────────┬─────────────┘
                                     │ REST/GraphQL API calls
                                     ▼
                        ┌─────────────────────────┐
                        │    Backend API Server    │
                        │   (NestJS/Express + TS)  │
                        │  Auth, Products, Orders, │
                        │  Payments, Banners, etc. │
                        └───┬───────────┬──────────┘
                            │           │
                 ┌──────────▼───┐   ┌───▼────────────┐
                 │  MongoDB   │   │ External Services│
                 │  (Prisma ORM) │   │  Cloudinary,
                 └───────────────┘   │  │
                                     └────────────────────┘
```

---

## 3. Data Model (Core Entities)

```
User
 ├─ id, name, email, phone, passwordHash, role [BUYER | ADMIN]
 ├─ createdAt, isVerified

Address
 ├─ id, userId (FK), label, fullName, phone, addressLine, city, postalCode, isDefault

Category
 ├─ id, name, slug, parentCategoryId (self-relation, nullable), imageUrl, sortOrder

Product
 ├─ id, title, slug, description, categoryId (FK), brand
 ├─ basePrice, discountType [PERCENT|FLAT], discountValue, discountStartAt, discountEndAt
 ├─ status [DRAFT|PUBLISHED|ARCHIVED], codEligible (bool)
 ├─ weight, dimensions (for shipping calc)
 ├─ tags[], createdAt, updatedAt

ProductImage
 ├─ id, productId (FK), url, sortOrder, isPrimary

Attribute                     (e.g. "Color", "Size", "Material")
 ├─ id, name, isGlobal (bool — true for system defaults like Color/Size)

AttributeValue                (e.g. Color -> "Red" #FF0000, Size -> "XL")
 ├─ id, attributeId (FK), value, displayMeta (e.g. hex code for color swatches)

ProductAttribute               (links which attributes a product uses)
 ├─ id, productId (FK), attributeId (FK)

ProductVariant                 (the sellable SKU: e.g. Red / XL)
 ├─ id, productId (FK), sku, stockQuantity, priceOverride (nullable), imageUrl (nullable)

VariantAttributeValue          (join table: which attribute-values make up this variant)
 ├─ id, variantId (FK), attributeValueId (FK)

Cart
 ├─ id, userId (FK — required, no guest carts)
CartItem
 ├─ id, cartId (FK), variantId (FK), quantity

CodOrderRequest                (the WhatsApp confirmation pre-order stage)
 ├─ id, userId (FK), addressId (FK)
 ├─ status [AWAITING_CONVERSATION|PENDING_SELLER_APPROVAL|ACCEPTED|REJECTED]
 ├─ items (JSON snapshot or relation to CodOrderRequestItem: variantId, quantity, priceAtRequest)
 ├─ rejectionReason (nullable), stockHeldUntil (soft stock reservation expiry)
 ├─ createdAt, decidedAt
   → on ACCEPTED, an Order is created from this request (see below) and this record is linked via orderId

Order
 ├─ id, userId (FK), addressId (FK)
 ├─ status [CONFIRMED|SHIPPED|OUT_FOR_DELIVERY|DELIVERED|CANCELLED|RETURNED]
 ├─ paymentMethod [COD|CARD|WALLET], paymentStatus [PENDING|PAID|FAILED|REFUNDED]
 ├─ codRequestId (FK, nullable — links back to the originating CodOrderRequest for COD orders)
 ├─ subtotal, discountAmount, shippingFee, tax, total
 ├─ trackingNumber, courierName, createdAt, deliveredAt, cancelledAt
   Note: card/wallet orders skip CodOrderRequest entirely and are created directly in CONFIRMED status
   on successful payment. COD orders are only ever created here once a CodOrderRequest is ACCEPTED.

OrderItem
 ├─ id, orderId (FK), variantId (FK), quantity, priceAtPurchase

OrderMessage                   (in-order chat thread, unlocked once Order is CONFIRMED)
 ├─ id, orderId (FK), senderRole [BUYER|SELLER], message, createdAt, readAt

Notification
 ├─ id, userId (FK), type [ORDER_ACCEPTED|ORDER_REJECTED|ORDER_SHIPPED|ORDER_DELIVERED|ORDER_CANCELLED|NEW_COD_REQUEST|NEW_REVIEW|GENERIC]
 ├─ orderId (FK, nullable), title, body, isRead, createdAt
   → queried on app load: `WHERE userId = :me AND isRead = false` to drive the pop-up queue


Banner
 ├─ id, imageUrl, title, subtitle, ctaText, ctaLink
 ├─ startAt, endAt, sortOrder, isActive

Review
 ├─ id, productId (FK), orderId (FK), userId (FK), rating, comment, photos[], isVerifiedPurchase, sellerReply
   Note: creating a Review requires orderId to reference an Order with status = DELIVERED belonging to
   that user — enforced server-side, not just hidden in the UI, so the "review only after delivery" rule
   can't be bypassed by calling the API directly.

Wishlist / WishlistItem
 ├─ standard join table: userId, productId
```

**Product promotion fields** (add to the `Product` entity from above):
```
Product
 ├─ ...(existing fields)...
 ├─ isFeatured (bool), featuredRank (int, nullable), featuredStartAt, featuredEndAt
```

**Design notes:**
- The `Attribute` / `AttributeValue` / `ProductAttribute` / `VariantAttributeValue` structure is what makes the "seller picks Color/Size or adds a custom attribute" requirement work cleanly — it's a classic EAV-lite pattern used by real platforms (Shopify, WooCommerce) for product variants.
- `Product` vs `ProductVariant` split lets one product page show multiple buyable combinations, each with its own stock/price.
- Schema uses a single `role` field on `User` (BUYER/ADMIN) for v1 single-seller; a future multi-seller version would add a `Store`/`Seller` entity that `Product` references — the schema already isolates seller-owned data so this migration is straightforward later.
- **COD is intentionally two-stage** (`CodOrderRequest` → `Order`): this keeps "did the buyer confirm intent on WhatsApp and did the seller accept" as an explicit, auditable state machine, separate from the normal order lifecycle. Card/wallet payments skip this stage entirely since payment capture itself is the confirmation.
- **`role` is a server-enforced claim**, checked via auth middleware on every request — never trust a role value coming from the client (query param, hidden form field, or unverified JWT). The admin login endpoint should also live at a non-linked path and not appear in the public storefront's navigation or sitemap.
- **Review write-access is enforced by the DB relation**, not the UI: the API only accepts a review creation call if the referenced order (a) belongs to the requesting user and (b) has `status = DELIVERED`. This is what makes "buyer can only review after the delivery popup" actually unbypassable rather than just a UI convention.

---

## 4. API Endpoint Plan (Representative, not exhaustive)

### Public / Buyer  (all require auth except register/login/forgot-password/product browsing)
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/forgot-password
GET    /products                 (filters: category, price, color, size, sort, search, page — featured items pinned first)
GET    /products/:slug
GET    /products/:slug/similar
GET    /categories
GET    /banners/active
POST   /cart/items                          [auth required]
GET    /cart                                [auth required]
DELETE /cart/items/:id                      [auth required]

# Card/wallet checkout — places order immediately
POST   /orders                              [auth required]

# COD checkout — WhatsApp confirmation flow
POST   /cod-requests                        [auth required] (creates AWAITING_CONVERSATION request, returns wa.me link)
PATCH  /cod-requests/:id/conversation-done   [auth required] (buyer confirms → PENDING_SELLER_APPROVAL)
GET    /cod-requests/:id                    [auth required]

GET    /orders/:id                          [auth required]
GET    /me/orders                           [auth required]
GET    /orders/:id/messages                 [auth required]
POST   /orders/:id/messages                 [auth required] (buyer side of in-order chat)

POST   /reviews                             [auth required] (server validates order.status === DELIVERED and order.userId === requester)
GET    /products/:id/reviews
POST   /wishlist/:productId                 [auth required]

GET    /notifications?unread=true           [auth required] (drives the on-load popup queue)
PATCH  /notifications/:id/read              [auth required]
```

### Admin (role-protected, non-public login path)
```
POST   /admin/products
PATCH  /admin/products/:id
DELETE /admin/products/:id
POST   /admin/products/:id/variants
PATCH  /admin/products/:id/promote          (set isFeatured, featuredRank, featuredStartAt/EndAt)
POST   /admin/attributes                    (create custom attribute)
POST   /admin/categories
POST   /admin/banners
PATCH  /admin/banners/:id
GET    /admin/orders
PATCH  /admin/orders/:id/status             (Shipped / Out for Delivery / Delivered / Cancelled — fires buyer notification)
GET    /admin/orders/:id/messages
POST   /admin/orders/:id/messages           (seller side of in-order chat)

# COD approval queue
GET    /admin/cod-requests?status=PENDING_SELLER_APPROVAL
PATCH  /admin/cod-requests/:id/accept       (creates the real Order, notifies buyer)
PATCH  /admin/cod-requests/:id/reject       (closes request, releases stock hold, notifies buyer)

GET    /admin/dashboard/summary
GET    /admin/reports/sales
```

---

## 5. UI/UX Plan

### 5.1 Design System Setup (do this first)
- Define color palette, typography scale, spacing scale, button/input/card components in Tailwind config
- Build a small internal component library: `Button`, `Card`, `Badge` (for discount %), `Rating`, `Modal`, `Toast`, `Skeleton`, `Tabs`

### 5.2 Key Screens to Design/Build
**Storefront:** Homepage, Category/Listing page, Product Detail, Cart, Checkout (multi-step), Order Confirmation, Login/Register, Account Dashboard (orders, addresses, wishlist, profile)

**Admin:** Login, Dashboard, Product List, Add/Edit Product (multi-tab: Basic Info / Images / Variants & Attributes / Pricing & Discount / Shipping), Category Manager, Banner Manager (with a visual scheduler — date/time pickers), Order List & Detail, Reports

### 5.3 UX Priorities
- Add-to-cart should never feel like a page reload (optimistic UI + toast)
- Variant selection should update price/stock/image instantly
- Banner scheduling UI should show a calendar/timeline so the seller can visually see upcoming/active/expired banners
- Mobile-first: bottom nav bar for storefront on mobile (Home, Categories, Cart, Account)

---


