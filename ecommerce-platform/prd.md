# Product Requirements Document (PRD)


## Single-Seller E-Commerce Marketplace Platform


Note : As Our website is for both Mobile user and Wesite user , so i want the Profer Respoiveness in this Wesbite like it Work Perfect  for Moible , Tablet and Wesite Users Too.


---

## 1. Overview

### 1.1 Product Vision
A full-fledged, single-seller e-commerce marketplace platform (similar in spirit to Daraz, Zeno, etc.) where **one seller/admin** manages the entire catalog, and **multiple buyers** can browse, purchase, and track orders. The platform should feel like a real marketplace in UX (categories, banners, deals, search, recommendations) even though there's only one seller behind it.

### 1.2 Key Actors
| Role | Description |
|---|---|
| **Buyer** | Registers an account, browses products, adds to cart/wishlist, checks out, tracks orders, leaves reviews |
| **Seller / Admin** | The single seller who owns the store. Manages products, categories, banners, discounts, orders, and inventory. (Seller = Admin in this system, but should be architected so it *could* later expand to multi-seller) |
| **Guest** | Can browse and search but must register/login to purchase |

### 1.3 Goals
- Deliver a polished, trustworthy shopping experience with excellent UI/UX
- Give the seller full control over product presentation (variants, discounts, attributes)
- Support real-world commerce needs: COD, discounts, banners, related products, categories
- Be built on a schema flexible enough to support future growth (multi-seller, more payment gateways, etc.)

---

## 2. Core Feature Requirements

### 2.1 Buyer-Facing Storefront

#### 2.1.1 Homepage / Marketplace
- Hero banner carousel (see 2.4 — Banner Management)
- Featured categories grid
- "Flash Deals" / "Today's Discounts" section
- New arrivals section
- Best sellers / trending section
- Personalized "Recommended for you" section (based on browsing/purchase history — can start rule-based, upgrade later)

#### 2.1.2 Product Listing / Category Pages
- Grid/list view toggle
- Filters: category, price range, color, size, rating, discount %, availability (in stock/out of stock)
- Sorting: price (low-high, high-low), newest, popularity, rating, discount
- Pagination or infinite scroll
- Breadcrumb navigation

#### 2.1.3 Search
- Keyword search with autosuggestions (product name, category, brand/tags)
- Search results ranked by relevance, with same filter/sort options as category pages
- "No results found" state with suggested categories

#### 2.1.4 Product Detail Page
- Image gallery (multiple images, zoom on hover, video support optional)
- Title, price, discounted price (strike-through original price), discount badge (e.g. "-20%")
- Variant selectors: **Color swatches** and **Size buttons** (dynamically rendered based on what the seller configured for that product)
- Stock status per variant combination (e.g., "Red / XL — 3 left")
- Quantity selector
- "Add to Cart" and "Buy Now" buttons
- Delivery estimate + Cash on Delivery availability badge
- Product description (rich text, supports bullet specs)
- Attribute/specification table (dynamic key-value pairs, e.g. Material, Weight, Brand)
- Customer reviews & ratings (star rating breakdown + written reviews + photos)
- **"You may also like" / "Similar Products"** section (see 2.6)
- **"Frequently bought together"** (optional/nice-to-have)
- Share product (copy link / social share)
- Wishlist (heart icon)

#### 2.1.5 Cart
- **Login/signup is required before a buyer can add anything to cart or view the cart.** There is no guest cart. Clicking "Add to Cart" while logged out opens a login/register modal; on successful login, the action completes automatically (no need to re-click).
- View items with variant details (color/size), quantity editable, remove item
- Auto-recalculate subtotal, discount,  total
- "Proceed to Checkout" CTA
- Persistent cart tied to the account (cart contents remain if the buyer logs out and back in later)

#### 2.1.6 Checkout
- Shipping address form (with saved addresses + "add new address")
- Delivery method selection (if applicable)
- Payment method selection:
  - **Cash on Delivery (COD)** — routed through the WhatsApp confirmation flow described in 2.5.1 below. This does **not** place an order immediately.
  - Mobile wallet / bank transfer (optional, region-relevant, configurable) — same immediate-placement behavior as card
- Order summary with itemized breakdown (subtotal, discount, total)
- For COD: instead of a confirmation page, the buyer is taken into the **WhatsApp confirmation flow** (2.5.1) — the "order" only becomes real once the seller accepts it there


#### 2.1.7 Buyer Account (Profile Module)
- Register / Login (email + password)

- Profile management (name, email, phone, profile picture)
- Address book (multiple saved addresses, set default)
- Wishlist page


This module is deliberately kept to **identity and personal settings only**. Anything order-related lives in its own module (2.1.8) so the two don't get tangled together in the UI or the codebase.

#### 2.1.8 My Orders (Order Management Module)
This is a distinct module from the Account/Profile module above — its own nav item, its own routes, its own component tree. It owns everything from the moment a purchase is initiated through delivery and review.

- Order history (list of past orders). Status flow differs slightly by payment type:
  - **COD orders**: `Awaiting WhatsApp Confirmation` → `Pending Seller Approval` → `Confirmed` (or `Rejected`) → `Shipped` → `Out for Delivery` → **`Delivered`** (or `Cancelled`) — the last two are set manually by the seller once cash is actually collected or the delivery falls through
- **In-order message thread** with the seller for delivery coordination (unlocked once an order reaches `Confirmed`)
- **Review popup on delivery**: the moment an order is marked `Delivered`, the buyer's next visit (or the notification click) triggers a popup prompting them to write a star rating + comment for the purchased product(s). Reviews cannot be submitted any other way — there is no open "write a review" button sitting on the product page for buyers who haven't received a delivered order. (Submitting from here is what populates the read-only "Reviews I've written" list under Account.)
- Return/refund request flow

Order-related notifications (status changes, delivery prompts) are generated and stored by the separate **Notifications module (2.7)**, but this My Orders module is where the buyer lands when they act on one — Account/Profile has no order data in it at all.





### 2.2 Seller / Admin Panel

#### 2.2.1 Dashboard
- Sales overview (daily/weekly/monthly revenue chart)
- Order stats (pending, processing, shipped, delivered, cancelled counts)
- Low-stock alerts
- Top-selling products 
- Recent orders feed

#### 2.2.2 Product Management (Full CRUD + Customization)
- **Add Product**:
  - Title, description (rich text editor), category, brand
  - Multiple image upload (drag-drop, reorder, set primary image)
  - Base price, discount type (percentage or flat amount), discount start/end date (scheduled sales)
  - SKU / stock quantity
  - **Attribute system**:
    - Predefined common attributes available by default: **Color**, **Size** (S, M, L, XL, XXL, or custom free-text sizes like "42 EU", "10 US")
    - Seller can **select which attributes apply** to this product (e.g., a T-shirt gets Color + Size, a phone case gets only Color)
    - Seller can **add entirely custom attributes** (e.g., "Material", "Storage Capacity", "Weight") with their own value options
    - For each attribute, seller defines the list of values (e.g., Color: Red, Blue, Black — each with an optional hex code for swatch display)
  - Tags/keywords for search
  - COD eligibility toggle per product (some items may be online-payment-only)
  - Status: Draft / Published / Out of Stock / Archived
- **Edit Product**: modify any of the above, update stock, change discount, deactivate variants
- **Bulk actions**: bulk discount apply, bulk stock update, bulk category change, CSV import/export (nice-to-have)
- **Duplicate product** (clone an existing listing as a starting point)

#### 2.2.3 Category Management
- Create/edit/delete categories and subcategories (nested, e.g. Men > Clothing > T-Shirts)
- Assign category image/icon
- Reorder categories (for homepage display priority)

#### 2.2.4 Discount & Promotions Management
- Per-product discounts with scheduled start/end (auto-activates and auto-expires)
- Store-wide flash sale scheduling

#### 2.2.5 Hero Banner Management
- Upload banner image(s) for homepage carousel
- Set banner title/subtitle/CTA button text and link (e.g., link to a category or specific product/sale)
- **Schedule banner visibility**: set start date/time and end date/time — banner automatically appears and disappears based on this schedule
- Reorder/prioritize active banners
- Preview before publishing
- Support for multiple banner slots (e.g., main hero carousel + secondary promo strips)

#### 2.2.6 Order Management
- View all orders with filters (status, date range, payment method)
- Update order status (Confirm → Process → Ship → Deliver)
- Cancel/refund order
- COD reconciliation view (track cash-collected orders)

#### 2.2.7 Inventory Management
- Stock levels per variant
- Low-stock threshold alerts
- Stock history/audit log

#### 2.2.8 Customer & Review Management
- View registered buyers list
- View/moderate product reviews (approve/hide inappropriate reviews, respond to reviews)

#### 2.2.9 Reports & Analytics
- Sales reports (by date range, category, product)
- Best/worst performing products



### 2.4 Hero Banner / Marketing System
- Time-scheduled banners as described above
- Countdown timer support on banners for flash sales (e.g., "Sale ends in 02:14:33")
- Support banner deep-linking to filtered category views or specific sale collections

### 2.5 Payment & Checkout Requirements
- **Cash on Delivery (COD)** — 

#### 2.5.1 COD via WhatsApp — Confirmation Workflow
This is a deliberate manual-approval step so the seller can verbally/textually confirm real intent to buy before committing inventory, since payment isn't captured online.

1. **Buyer selects COD at checkout.** The screen shows the seller's WhatsApp number and a "Message Seller on WhatsApp" button. This button opens WhatsApp (web or app, via a `wa.me` deep link) with a pre-filled message summarizing the order: product(s), variant(s), quantity, total, and delivery address.
2. **Buyer chats with the seller on WhatsApp** (outside the platform) to confirm details.
3. **Buyer returns to the site and clicks "Conversation Done."** This is the buyer explicitly confirming they've spoken to the seller and still want to proceed. At this point a **Pending Order Request** is created — it is *not yet* a confirmed order, but it does reserve/soft-hold the stock briefly so it isn't oversold while the seller decides.
When the Buyer Click "Conversation Done." Then Seller Get the These Order Deatils As seprated (As Pending request).
4. **Seller sees the pending request in the admin panel**   (product(s), quantity, variant, buyer name/phone/address) and clicks **Accept** or **Reject**.
   - **Accept** → the request becomes a real **Order** in `Confirmed` status. Buyer is notified immediately. The order now appears in the buyer's "My Orders" with a full order card (items, variant, price, delivery address, status).
   - **Reject** → the request is closed as `Rejected`, stock hold is released, and the buyer is notified (optionally with a short reason field the seller can fill in).
5. **From here it follows the normal order lifecycle**: Confirmed → Shipped → Out for Delivery → **Delivered / Cancelled**, both set manually by the seller once the actual cash handoff (or its failure) happens in real life.
6. **Every status change in this flow fires a buyer notification** (see 2.7).

### 2.6 Reviews & Ratings
- Star rating (1–5) + written review
- Photo upload with review
- Verified purchase badge
- Seller can respond to reviews
- Average rating displayed on product cards and detail page

### 2.7 Notifications & Unread Order Updates Module
- Email notifications: order placed, order shipped, order delivered, password reset, promotional emails (opt-in)
- SMS notifications (optional, for OTP and order status — especially useful for COD confirmation)
- **In-app notification center**, plus a dedicated **order-updates module** that behaves like this:
  - Every meaningful order event (Pending Approval created, Accepted, Rejected, Shipped, Delivered, Cancelled) creates a notification record tied to the buyer and flagged `unread`
  - **When the buyer opens the site/app and has any unread order notifications, they are surfaced immediately as a pop-up/modal queue** (not just a silent badge) — e.g. "Your order #1234 has been Delivered — leave a review" or "Your order #1231 was Cancelled by the seller"
  - If the notification is a `Delivered` event, the popup includes (or leads directly into) the **review/comment form** described in 2.1.7
  - Once viewed/dismissed, notifications are marked read and won't pop up again, but remain visible in a notification history list
  - Seller also gets a parallel version of this: an unread queue for new **Pending Order Requests** (from the WhatsApp COD flow) and new reviews awaiting moderation

### 2.8 Role-Based Access Control (RBAC)
- Every account has exactly one role: **Buyer** or **Seller/Admin**
- Roles are enforced server-side on every API route and page — never inferred from client state alone
- Buyer-role tokens cannot access any `/admin/*` route or admin API endpoints, even if a buyer somehow knows the URL
- The seller/admin account is provisioned separately (not through the public "Register" form) — there is no self-service path for a buyer to become a seller
- Session/JWT tokens carry the role claim and are re-validated on the backend for every protected action (add product, update order status, etc.)

### 2.9 Seller-Controlled Product Promotion
- Seller can mark any product as **Featured/Promoted**, independent of discounts
- Featured products get a badge (e.g., "Featured" / "Seller's Pick") and are **pinned to the front** of the homepage's featured rail and to the top of their category's listing (ahead of normal sort order, but filters/sort the buyer explicitly applies still take priority)
- Seller can set a manual promotion order (drag-to-reorder or a numeric rank) when multiple products are promoted at once
- Promotion can optionally be time-bound (start/end), reusing the same scheduling pattern as banners and discounts, so a "featured" push can be temporary

---

## 3. Non-Functional Requirements

### 3.1 UI/UX
- I want Catchy UI/UX that look Beautiful , Also the Button is Navbar Button button Also Conain Hive r. Also write the Hiver where you think to Add. Use cathy Color SCHEME
- Clean, modern, mobile-first responsive design
- Fast page loads (image optimization, lazy loading, skeleton loaders)
- Consistent design system (typography, spacing, color palette, component library)
- Accessible (WCAG AA where feasible — proper contrast, alt text, keyboard navigation)
- Smooth micro-interactions (hover states, add-to-cart animation, toast notifications)
- Dark mode (nice-to-have)

### 3.2 Performance
- Product listing pages should load in <2s on average connection
- Image CDN / optimized formats (WebP)
- Server-side rendering or static generation for SEO-critical pages (product/category pages)

### 3.3 Security
- Password hashing (bcrypt/argon2) for **all** accounts, including the seller/admin account
- HTTPS everywhere
- Input validation & sanitization (prevent XSS/SQL injection)
- Rate limiting + temporary lockout on repeated failed login attempts, applied more aggressively on the admin login endpoint
- The admin login route is not linked anywhere in the public storefront UI (no "Seller Login" button on the main nav) — it's a known-but-unadvertised path, reducing casual discovery/brute-force attempts by buyers
- Secure payment handling (never store raw card data — use payment gateway tokenization, PCI-DSS compliance via gateway)
- Strict role-based access control (see 2.8) enforced server-side on every route, not just hidden in the UI
- Consider optional 2FA (TOTP or SMS OTP) on the seller/admin account, since it's the single highest-value account on the platform

### 3.4 Scalability & Maintainability
- Modular codebase (clear separation: storefront, admin panel, API)
- Database schema designed to support future multi-seller expansion without a full rewrite
- API-first architecture so future mobile app can reuse the same backend

### 3.5 SEO
- SEO-friendly URLs (`/product/red-cotton-t-shirt`)
- Meta tags, Open Graph tags per product
- Sitemap.xml, robots.txt
- Structured data (schema.org Product markup) for rich search snippets

---




