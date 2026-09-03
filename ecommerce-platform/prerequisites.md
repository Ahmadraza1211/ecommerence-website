# Prerequisites & Setup Guide

This document explains everything you need to install, configure, and run the complete Shopwave single-seller e-commerce marketplace platform — frontend, backend, MongoDB, Cloudinary, and the Python seed script.
mongodb://localhost:27017/Project1


New_Project
978337181471539
FD0QvOhWpQC7ON08j8S_8Se-qdw
---

## 1. Software Requirements

| Software | Minimum version | Purpose |
|---|---|---|
| **Node.js** | `v18.17+` (LTS recommended) | Runs the Next.js frontend and the Express backend |
| **npm** | `v9+` | Package manager (ships with Node.js) |
| **MongoDB** | `v6.0+` (or MongoDB Atlas free tier) | Database — the **only** database used by this project |
| **Python** | `v3.10+` | Runs the seed script that inserts demo data into MongoDB |
| **Cloudinary account** | Free tier is fine | Stores product, banner, category, and avatar images |

> **Tip:** You can use a local MongoDB instance (`mongodb://localhost:27017`) **or** a free MongoDB Atlas cluster (`mongodb+srv://...`). Both work identically.

---

## 2. Installation Steps

### 2.1 Clone / Unzip
```bash
unzip ecommerce-platform.zip
cd ecommerce-platform
```

The project is organized as:
```
ecommerce-platform/
├── backend/         # Express + TypeScript API (port 5000)
├── frontend/        # Next.js 14 storefront + admin (port 3000)
├── seed/            # Python seed script + requirements.txt
├── docs/            # API documentation
├── prerequisites.md # This file
├── README.md        # Project overview
└── .env.example     # (per-service env files are inside backend/ and frontend/)
```

### 2.2 Install Backend Dependencies
```bash
cd backend
cp .env.example .env       # then edit .env (see Section 3)
npm install
```

### 2.3 Install Frontend Dependencies
```bash
cd ../frontend
cp .env.example .env       # then edit .env (see Section 3)
npm install
```

### 2.4 Install Python Seed Dependencies
```bash
cd ../seed
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## 3. Configuration (Environment Variables)

### 3.1 Backend — `backend/.env`
Open `backend/.env` and fill in the values. **None of these are optional at runtime** except where noted.

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port for the API server | `5000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `CLIENT_URL` | The frontend origin (used by CORS) | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/ecommerce` |
| `JWT_SECRET` | Long random string for signing JWTs | `use_a_32+_char_random_string` |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `JWT_REFRESH_COOKIE_NAME` | Cookie name for refresh token | `refreshToken` |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard | `my-store` |
| `CLOUDINARY_API_KEY` | From your Cloudinary dashboard | `123456789012345` |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard | `abc...` |
| `CLOUDINARY_FOLDER_PREFIX` | Folder prefix inside Cloudinary | `ecommerce` |
| `SELLER_WHATSAPP_NUMBER` | WhatsApp number (international, no `+`) for COD | `923001234567` |
| `SELLER_NAME` | Display name of the seller | `Marketplace Store` |
| `BCRYPT_ROUNDS` | Bcrypt cost factor (keep at 10) | `10` |
| `LOGIN_MAX_ATTEMPTS` | Max failed login tries before lockout | `5` |
| `LOGIN_LOCK_MINUTES` | Lockout duration in minutes | `15` |

### 3.2 Frontend — `frontend/.env`
| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `NEXT_PUBLIC_SELLER_WHATSAPP_NUMBER` | WhatsApp number for COD deep link | `923001234567` |

> Both `.env.example` files are committed to the project as references. **Do NOT commit your real `.env` files.**

---

## 4. Cloudinary Setup

1. Create a free Cloudinary account at <https://cloudinary.com>.
2. From the dashboard, copy your `Cloud name`, `API key`, and `API secret`.
3. Paste them into `backend/.env` under the `CLOUDINARY_*` keys.
4. All product, banner, and category images uploaded through the admin panel are stored in Cloudinary under the `ecommerce/` folder prefix.
5. The seed script references Unsplash URLs for demo product images — those do **not** require Cloudinary.

---

## 5. MongoDB Setup

You have two options:

### Option A — Local MongoDB
Install MongoDB Community Edition from <https://www.mongodb.com/try/download/community>. Start it and verify with:
```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```
Default connection string: `mongodb://localhost:27017/ecommerce`

### Option B — MongoDB Atlas (free tier, no install)
1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Add a database user and whitelist your IP (`0.0.0.0/0` works for development).
3. Copy the connection string: `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/ecommerce`
4. Paste it as `MONGODB_URI` in `backend/.env`.

Either way, the schema is created automatically by the backend when it first starts (Mongoose auto-creates collections on first write).

---

## 6. Running the Project

You need **three terminals** running — backend, frontend, and (only once) the seed script.

### Terminal 1 — Start MongoDB (only if running locally)
```bash
# Linux/macOS:
sudo systemctl start mongod

# Or run mongod directly:
mongod --dbpath /path/to/data
```

### Terminal 2 — Start the Backend API
```bash
cd backend
npm run dev
```
You should see:
```
[MongoDB] connected: localhost/ecommerce
[Server] listening on http://localhost:5000
[Server] CORS origin: http://localhost:3000
```
The API health check is at <http://localhost:5000/api/health>.

### Terminal 3 — Seed the Database (one-time)
```bash
cd seed
source .venv/bin/activate
python seed.py --mongodb "mongodb://localhost:27017/ecommerce"
```
You should see a summary table showing 2 users, 4 products, 2 orders, etc. See Section 7 for what data gets inserted.

> **Re-running is safe** — by default the script wipes the seeded collections first. Use `--keep` to keep existing data and only insert missing documents.

### Terminal 4 — Start the Frontend
```bash
cd frontend
npm run dev
```
Open <http://localhost:3000>.

---

## 7. Demo Accounts & Sample Data

After running the seed script, the following demo accounts are available:

| Role | Email | Password | Where to log in |
|---|---|---|---|
| Admin / Seller | `admin@shopwave.demo` | `admin123` | <http://localhost:3000/admin/login> |
| Buyer | `buyer@shopwave.demo` | `buyer123` | <http://localhost:3000/login> |

> **The admin login URL is intentionally not advertised in the storefront UI** — type it directly.

### Sample data inserted
- 1 seller/admin user, 1 buyer user
- 1 saved address for the buyer
- 4 categories: Electronics, Fashion, Home & Living, Accessories
- 4 products (with images, variants, attributes, discounts):
  - **AuraBeat Pro Wireless Earbuds** — Black/White variants, 15% discount, featured
  - **CloudSoft Fleece Hoodie** — Color × Size variants, flat 500 PKR discount
  - **Mornings Ceramic Mug** — Color variants, no discount, featured
  - **ShieldPro Phone Case** — Clear/Black variants, **Clear has 0 stock** (demonstrates Out-of-Stock UI)
- 2 orders tied to the buyer:
  - **Order #1** — Hoodie Red/Small ×1 — status `DELIVERED` (triggers review popup)
  - **Order #2** — Earbuds Black ×2 — status `CONFIRMED`
- Stock values are pre-synced with these orders:
  - Earbuds Black: 5 → **3** (after Order #2)
  - Hoodie Red/Small: 1 → **0** (after Order #1, demonstrates Out-of-Stock)
- 1 active homepage banner
- 2 notifications (one unread delivered-triggering-review, one read)
- 1 wishlist entry (the buyer saved the mug)
- 1 empty cart for the buyer
- 2 in-order messages between seller and buyer on Order #1

---

## 8. Product Lifecycle & Stock Behavior

This implementation follows the lifecycle described in `prd.md` and `implementation_plan.md`:

### Stock flow
1. **Buyer adds to cart** — no stock change yet. The cart item shows current available stock.
2. **COD checkout**: 
   - `POST /cod-requests` — stock is **decremented immediately** as a soft-hold (so other buyers can't oversell while the WhatsApp conversation happens).
   - Seller accepts → the request becomes a real `Order` with status `CONFIRMED`. Stock hold is made permanent (no further change).
   - Seller rejects → held stock is **restored**.
3. **Card/wallet checkout** (`POST /orders`): stock is **decremented immediately** at order placement.
4. **Order cancelled** (after being confirmed): stock is **restored**.
5. **Order delivered**: no stock change (was already decremented at confirmation).

### Out-of-Stock behavior
- When a variant's `stockQuantity` reaches `0`, the product detail page shows:
  - An "Out of Stock" overlay on the product image
  - A red "Out of Stock" badge
  - Disabled "Add to Cart" and "Buy Now" buttons (grayed out, non-clickable)
  - Disabled variant swatch buttons for out-of-stock variants
- On product listing pages and product cards, out-of-stock products display the "Out of Stock" overlay and the add-to-cart button is disabled.
- The backend rejects any attempt to add an out-of-stock variant to the cart (`POST /cart/items` returns `400` with `{error: "Out of stock"}`).

### Order status flow
- **COD**: `AWAITING_CONVERSATION` → `PENDING_SELLER_APPROVAL` → `CONFIRMED` (real order created) → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED` (or `CANCELLED`).
- **Card/wallet**: directly `CONFIRMED` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED` (or `CANCELLED`).
- Every status transition fires a buyer notification (see Section 9).

---

## 9. Notifications Behavior

- The frontend polls `GET /notifications?unread=true` every 30 seconds when a buyer is logged in.
- Whenever unread notifications exist, a pop-up modal appears in the top-right showing one at a time.
- For `ORDER_DELIVERED` notifications, the popup includes a "Leave a review" button that opens the review form (which can only be submitted for delivered orders belonging to the buyer).
- Notifications can be dismissed (marked as read) and remain visible in a history list.

---

## 10. Verification Checklist

After running everything, verify the following:

- [ ] <http://localhost:3000> loads the homepage with the banner carousel and product sections.
- [ ] <http://localhost:3000/admin/login> accepts `admin@shopwave.demo` / `admin123`.
- [ ] <http://localhost:3000/login> accepts `buyer@shopwave.demo` / `buyer123`.
- [ ] The **ShieldPro Phone Case** (Clear variant) shows "Out of Stock" with disabled CTAs.
- [ ] The **CloudSoft Fleece Hoodie** in Red/Small shows 0 stock (sold out via Order #1).
- [ ] The buyer has an unread delivered notification that pops up on next page load with a "Leave a review" button.
- [ ] The admin dashboard shows 2 orders and the top-selling products.
- [ ] The admin can approve/reject a new COD request (try placing one yourself from the buyer account).
- [ ] Stock on the admin product list matches the actual MongoDB values.

---

## 11. Common Issues

| Issue | Fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. Start it with `sudo systemctl start mongod` or use Atlas. |
| `Cloudinary API key not configured` | You forgot to fill in `CLOUDINARY_*` in `backend/.env`. Image uploads will fail; browsing still works because seed uses Unsplash URLs. |
| `Cannot read property 'user' of null` in frontend | The auth store hasn't rehydrated yet. Refresh the page. |
| Admin login fails with "Invalid admin credentials" | You didn't run the seed script, or you changed the admin password in `seed.py`. Re-run `python seed.py`. |
| CORS error in browser | Make sure `CLIENT_URL` in `backend/.env` matches your frontend URL exactly (including port). |
| `pip: command not found` | Install Python 3.10+ from <https://python.org> or your system package manager. |
| Seed script fails with `ModuleNotFoundError: No module named 'pymongo'` | Activate the venv: `source .venv/bin/activate` then re-run. |

---

## 12. Production Notes (out of scope for this demo)

This project is a functional demo. For production you would also want:
- HTTPS termination (e.g., via a reverse proxy like Nginx or Vercel+Railway)
- Real email/SMS for password reset and order updates
- A real payment gateway (Stripe, SSLCommerz, etc.) for the card/wallet path
- Proper logging/observability (Sentry, LogRocket, etc.)
- Image optimization at the CDN edge (Cloudinary does this automatically)
- CSRF protection on cookie-based auth (currently using `sameSite: 'lax'`)
- Refresh-token rotation and reuse detection
- Server-side rate limit storage (Redis) instead of in-memory

These are intentionally left out to keep the demo focused and runnable on a single laptop.
