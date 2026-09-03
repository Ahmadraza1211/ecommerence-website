# Shopwave — Single-Seller E-Commerce Marketplace

A full-stack, single-seller e-commerce marketplace platform (similar in spirit to Daraz / Zeno) with:
- A modern, mobile-first storefront
- A separate admin panel for the seller
- Cash-on-Delivery via WhatsApp confirmation flow
- Real-time stock synchronization and Out-of-Stock UI
- Banners, categories, products with variants, discounts, featured promotions
- Reviews that unlock only after delivery
- In-app notification popups for order events
- MongoDB + Cloudinary backend

Built according to the provided `prd.md` and `implementation_plan.md`.

---

## Project Structure

```
ecommerce-platform/
├── backend/                     # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/              # env, db, cloudinary, multer
│   │   ├── middleware/          # auth (JWT + RBAC), error, validate, rate limiter
│   │   ├── models/              # Mongoose schemas (User, Product, Order, etc.)
│   │   ├── routes/              # public + buyer routes
│   │   │   └── admin/           # admin-only routes
│   │   ├── services/            # notification + stock services
│   │   ├── utils/               # pricing, auth helpers
│   │   └── index.ts             # entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                    # Next.js 14 + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── (storefront pages)
│   │   │   └── admin/           # admin panel (dashboard, products, orders, etc.)
│   │   ├── components/
│   │   │   ├── storefront/      # Navbar, Footer, ProductCard, etc.
│   │   │   ├── admin/           # ProductForm, etc.
│   │   │   └── ui/              # Skeleton, EmptyState, etc.
│   │   └── lib/                 # api client, auth store, utils
│   ├── .env.example
│   ├── package.json
│   └── tailwind.config.js
│
├── seed/                        # Python seed script
│   ├── seed.py                  # idempotent seed for demo data
│   └── requirements.txt
│
├── docs/
│   └── API.md                   # complete API documentation
│
├── prerequisites.md             # how to install & run everything
├── README.md                    # this file
└── prd.md / implementation_plan.md  # original product & technical specs
```

---

## Quick Start

```bash
# 1. Install backend deps
cd backend && npm install && cp .env.example .env

# 2. Install frontend deps
cd ../frontend && npm install && cp .env.example .env

# 3. Install Python seed deps
cd ../seed && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

# 4. Start MongoDB (locally or use Atlas)
sudo systemctl start mongod

# 5. Start backend (terminal 1)
cd ../backend && npm run dev

# 6. Seed the database (terminal 2, one-time)
cd ../seed && source .venv/bin/activate && python seed.py

# 7. Start frontend (terminal 3)
cd ../frontend && npm run dev
```

Open:
- Storefront: <http://localhost:3000>
- Admin login: <http://localhost:3000/admin/login>

**Demo credentials** (created by the seed script):
- Admin / Seller: `admin@shopwave.demo` / `admin123`
- Buyer: `buyer@shopwave.demo` / `buyer123`

See [`prerequisites.md`](./prerequisites.md) for the full setup guide including Cloudinary and MongoDB Atlas instructions.

See [`docs/API.md`](./docs/API.md) for the full API documentation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query, Zustand, React Hot Toast, lucide-react |
| Backend | Node.js, Express, TypeScript, Mongoose |
| Database | MongoDB (only) |
| Auth | JWT access + refresh tokens, bcrypt password hashing |
| File storage | Cloudinary (via multer-storage-cloudinary) |
| Seed script | Python 3.10+, pymongo, bcrypt |

---

## Feature Highlights

### Storefront
- **Homepage**: hero banner carousel, categories grid, flash deals, featured products, new arrivals, COD-flow explainer strip
- **Product listing**: filters (category, price, in-stock), sorting, pagination, breadcrumb, mobile bottom-nav
- **Product detail**: image gallery, variant selectors (color swatches + size buttons), per-variant stock status, quantity selector, Add-to-Cart & Buy-Now, trust badges, description, specs table, reviews, similar products
- **Cart**: requires login (redirects to login with redirect-back), quantity editing, out-of-stock warnings, sticky summary
- **Checkout**: address selection + add-new-address, COD flow with WhatsApp deep link + "Conversation Done" button, card/wallet demo flow
- **My orders**: list + detail with status timeline, in-order chat with seller, address panel
- **Account**: profile editing, address book, wishlist, orders nav
- **Notifications**: pop-up modal queue for unread notifications, with review-form trigger on `DELIVERED`

### Admin
- **Dashboard**: revenue, counts (orders by status, products, low-stock, buyers, pending COD requests), top-selling products, recent orders feed
- **Products**: full CRUD with multi-image upload, variants, attributes, discounts (with scheduling), featured promotion
- **Categories**: CRUD with optional image
- **Banners**: CRUD with image + schedule (start/end), preview active/upcoming/expired state
- **Orders**: filter by status & payment method, status update (fires buyer notifications), tracking number entry, in-order chat with buyer
- **COD requests**: pending-approval queue, accept (creates real Order) / reject (releases stock)
- **Reviews moderation**: hide/unhide reviews, reply to reviews

### Stock lifecycle (per the PRD)
- Stock is **decremented at COD-request creation** (soft-hold to prevent overselling during WhatsApp conversation)
- If the seller **rejects** the COD request → stock is **restored**
- If the seller **accepts** → real Order is created; stock hold becomes permanent
- Card/wallet orders decrement stock at placement
- Order **cancellation** restores stock
- Order **delivery** does not change stock (already decremented)
- When a variant reaches 0 stock, the UI shows "Out of Stock" overlay and disables Add-to-Cart / Buy-Now

### Security
- bcrypt password hashing for all accounts
- JWT access + refresh tokens (refresh in HTTP-only cookie)
- Role-based access control enforced server-side on every protected route
- Admin login at a non-advertised URL (`/admin/login`) and rate-limited more aggressively
- Rate limiting on all API endpoints; stricter limits on login endpoints
- Helmet + CORS configured for the frontend origin
- Cloudinary for image storage (no local file storage)

---

## Demo Data Summary

The seed script (`seed/seed.py`) inserts exactly:

- **2 users**: 1 admin/seller, 1 buyer (both with bcrypt-hashed passwords)
- **1 address** for the buyer (Lahore, default)
- **4 categories**: Electronics, Fashion, Home & Living, Accessories
- **4 products**, each with variants:
  - AuraBeat Pro Wireless Earbuds — 2 color variants, 15% discount, featured
  - CloudSoft Fleece Hoodie — 3 Color×Size variants, flat 500 PKR discount
  - Mornings Ceramic Mug — 2 color variants, featured
  - ShieldPro Phone Case — 2 variants; **Clear variant has 0 stock** (demonstrates Out-of-Stock UI)
- **2 orders** for the buyer:
  - Order #1: Hoodie Red/Small ×1 — `DELIVERED` (with chat messages)
  - Order #2: Earbuds Black ×2 — `CONFIRMED`
- **Stock synchronized with orders**:
  - Earbuds Black: stock = 3 (started at 5, sold 2 in Order #2)
  - Hoodie Red/Small: stock = 0 (started at 1, sold 1 in Order #1, demonstrates Out-of-Stock)
- **1 active banner** on the homepage
- **2 notifications** for the buyer (1 unread `ORDER_DELIVERED` that triggers review popup, 1 read `ORDER_ACCEPTED`)
- **1 wishlist** entry (buyer saved the mug)
- **1 empty cart** for the buyer (post-checkout state)
- **2 in-order chat messages** between seller and buyer on Order #1

All product, stock, order, buyer, seller, and notification data is mutually consistent — the same order is reflected correctly on the buyer side, seller side, and inventory counts.

---

## Documentation

- [`prerequisites.md`](./prerequisites.md) — install, configure, run
- [`docs/API.md`](./docs/API.md) — every API endpoint with request/response shapes
- [`prd.md`](./prd.md) — original product requirements document
- [`implementation_plan.md`](./implementation_plan.md) — original technical architecture

---

## License

Demo project for evaluation purposes. Not for production use.
