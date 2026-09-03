"""
Seed script for Shopwave e-commerce platform (v2 — with subcategories + full workflow).

PRD_New requirements addressed:
- Uses subcategories (Category → Subcategory → Product)
- 1 buyer with 3 orders going through the complete workflow:
    Order A: seller uploaded → buyer purchased → seller accepted → shipped → delivered → buyer left a review
    Order B: shipped but not yet delivered (chat active, seller has unread message)
    Order C: pending seller approval (stock NOT decremented — demonstrates new COD logic)
- Stock values are post-order-synchronized
- One product variant has stock = 0 (sold out via Order A) — demonstrates Out-of-Stock UI
- Includes unread order messages (for notification badge testing)

Run:
    python seed/seed.py --mongodb "mongodb://localhost:27017/ecommerce"

The script is idempotent: it wipes the collections before inserting.
"""
from __future__ import annotations

import argparse
import os
import sys
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

try:
    from pymongo import MongoClient
except ImportError:
    print("Missing dependencies. Run:  pip install pymongo bcrypt")
    raise

try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    HAS_BCRYPT = False
    print("Warning: 'bcrypt' not installed. Install with: pip install bcrypt", file=sys.stderr)


def hash_password(plain: str) -> str:
    if HAS_BCRYPT:
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=10)).decode()
    raise RuntimeError("bcrypt is required. Install with: pip install bcrypt")


def now() -> datetime:
    return datetime.now(timezone.utc)


def oid_seed(seed: str) -> str:
    h = hashlib.sha256(seed.encode()).hexdigest()[:24]
    return h


def to_oid(seed: str):
    try:
        from bson import ObjectId
        return ObjectId(oid_seed(seed))
    except ImportError:
        return oid_seed(seed)


# =========== USERS ===========
DEMO_SELLER = {
    "_id": to_oid("seller-admin"),
    "name": "Shopwave Admin",
    "email": "admin@shopwave.demo",
    "phone": "+923001234567",
    "passwordHash": "",
    "role": "ADMIN",
    "avatarUrl": "https://placehold.co/200x200/0f172a/ffffff?text=Admin",
    "isVerified": True,
    "failedLoginAttempts": 0,
    "lockUntil": None,
    "createdAt": now() - timedelta(days=60),
    "updatedAt": now() - timedelta(days=60),
}

DEMO_BUYER = {
    "_id": to_oid("buyer-1"),
    "name": "Ayesha Khan",
    "email": "buyer@shopwave.demo",
    "phone": "+923331234567",
    "passwordHash": "",
    "role": "BUYER",
    "avatarUrl": "https://placehold.co/200x200/e11d48/ffffff?text=A",
    "isVerified": True,
    "failedLoginAttempts": 0,
    "lockUntil": None,
    "createdAt": now() - timedelta(days=30),
    "updatedAt": now() - timedelta(days=30),
}

DEMO_ADDRESS = {
    "_id": to_oid("address-1"),
    "userId": DEMO_BUYER["_id"],
    "label": "Home",
    "fullName": "Ayesha Khan",
    "phone": "+923331234567",
    "addressLine": "House 12, Street 4, Gulberg III",
    "city": "Lahore",
    "postalCode": "54000",
    "isDefault": True,
    "createdAt": now() - timedelta(days=30),
    "updatedAt": now() - timedelta(days=30),
}

# =========== CATEGORIES + SUBCATEGORIES ===========
# PRD_New §Platform-Wide.5: real subcategories
CAT_ELECTRONICS = {"_id": to_oid("cat-electronics"), "name": "Electronics", "slug": "electronics", "parentCategoryId": None, "imageUrl": "", "sortOrder": 1, "isActive": True, "createdAt": now(), "updatedAt": now()}
CAT_FASHION     = {"_id": to_oid("cat-fashion"),     "name": "Fashion",     "slug": "fashion",     "parentCategoryId": None, "imageUrl": "", "sortOrder": 2, "isActive": True, "createdAt": now(), "updatedAt": now()}
CAT_HOME        = {"_id": to_oid("cat-home"),        "name": "Home & Living","slug": "home-living", "parentCategoryId": None, "imageUrl": "", "sortOrder": 3, "isActive": True, "createdAt": now(), "updatedAt": now()}

# Subcategories
SUB_AUDIO      = {"_id": to_oid("sub-audio"),      "name": "Audio",         "slug": "audio",         "parentCategoryId": CAT_ELECTRONICS["_id"], "imageUrl": "", "sortOrder": 1, "isActive": True, "createdAt": now(), "updatedAt": now()}
SUB_WEARABLES  = {"_id": to_oid("sub-wearables"),  "name": "Wearables",     "slug": "wearables",     "parentCategoryId": CAT_ELECTRONICS["_id"], "imageUrl": "", "sortOrder": 2, "isActive": True, "createdAt": now(), "updatedAt": now()}
SUB_MEN_CLOTHING = {"_id": to_oid("sub-men-clothing"), "name": "Men's Clothing", "slug": "mens-clothing", "parentCategoryId": CAT_FASHION["_id"], "imageUrl": "", "sortOrder": 1, "isActive": True, "createdAt": now(), "updatedAt": now()}
SUB_WOMEN_CLOTHING = {"_id": to_oid("sub-women-clothing"), "name": "Women's Clothing", "slug": "womens-clothing", "parentCategoryId": CAT_FASHION["_id"], "imageUrl": "", "sortOrder": 2, "isActive": True, "createdAt": now(), "updatedAt": now()}
SUB_KITCHEN    = {"_id": to_oid("sub-kitchen"),    "name": "Kitchen",       "slug": "kitchen",       "parentCategoryId": CAT_HOME["_id"], "imageUrl": "", "sortOrder": 1, "isActive": True, "createdAt": now(), "updatedAt": now()}

CATEGORIES = [CAT_ELECTRONICS, CAT_FASHION, CAT_HOME, SUB_AUDIO, SUB_WEARABLES, SUB_MEN_CLOTHING, SUB_WOMEN_CLOTHING, SUB_KITCHEN]

# =========== PRODUCTS ===========
# Product 1: Wireless Earbuds (Electronics > Audio) — Black variant starts at 5, becomes 3 after Order B (2 sold)
ATTR_COLOR_ELEC = {"_id": to_oid("attr-color-elec"), "name": "Color", "isGlobal": True}
earbuds_attr_values = [
    {"_id": to_oid("av-eb-black"), "attributeId": ATTR_COLOR_ELEC["_id"], "value": "Black", "displayMeta": "#1f2937"},
    {"_id": to_oid("av-eb-white"), "attributeId": ATTR_COLOR_ELEC["_id"], "value": "White", "displayMeta": "#f8fafc"},
]
PROD_EARBUDS = {
    "_id": to_oid("prod-earbuds"),
    "title": "AuraBeat Pro Wireless Earbuds",
    "slug": "aurabeat-pro-wireless-earbuds",
    "description": "Truly wireless earbuds with active noise cancellation, 30-hour battery life, USB-C fast charging, and IPX5 water resistance.",
    "categoryId": SUB_AUDIO["_id"],
    "brand": "AuraBeat",
    "basePrice": 7990,
    "discountType": "PERCENT",
    "discountValue": 15,
    "discountStartAt": now() - timedelta(days=2),
    "discountEndAt": now() + timedelta(days=14),
    "status": "PUBLISHED",
    "codEligible": True,
    "weight": 80,
    "material": "Plastic",
    "tags": [],
    "images": [
        {"url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80&auto=format&fit=crop", "sortOrder": 0, "isPrimary": True},
        {"url": "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80&auto=format&fit=crop", "sortOrder": 1, "isPrimary": False},
    ],
    "attributes": [ATTR_COLOR_ELEC],
    "attributeValues": earbuds_attr_values,
    # Black variant: started at 5, sold 2 in Order B → stock = 3
    "variants": [
        {"_id": to_oid("var-eb-black"), "sku": "EB-PRO-BLK", "stockQuantity": 3, "priceOverride": None, "imageUrl": None, "attributeValues": [earbuds_attr_values[0]["_id"]]},
        {"_id": to_oid("var-eb-white"), "sku": "EB-PRO-WHT", "stockQuantity": 4, "priceOverride": None, "imageUrl": None, "attributeValues": [earbuds_attr_values[1]["_id"]]},
    ],
    "isFeatured": True,
    "featuredRank": 1,
    "featuredStartAt": now() - timedelta(days=1),
    "featuredEndAt": now() + timedelta(days=30),
    "createdAt": now() - timedelta(days=20),
    "updatedAt": now() - timedelta(days=2),
}

# Product 2: Cotton Hoodie (Fashion > Men's Clothing) — Red/Small starts at 1, becomes 0 after Order A
hoodie_color_attr = {"_id": to_oid("attr-color-hoodie"), "name": "Color", "isGlobal": True}
hoodie_attr_values = [
    {"_id": to_oid("av-hd-red"),    "attributeId": hoodie_color_attr["_id"], "value": "Red",    "displayMeta": "#dc2626"},
    {"_id": to_oid("av-hd-navy"),   "attributeId": hoodie_color_attr["_id"], "value": "Navy",   "displayMeta": "#1e3a8a"},
    {"_id": to_oid("av-hd-sm"),     "attributeId": to_oid("attr-size-hoodie"), "value": "S",      "displayMeta": None},
    {"_id": to_oid("av-hd-md"),     "attributeId": to_oid("attr-size-hoodie"), "value": "M",      "displayMeta": None},
    {"_id": to_oid("av-hd-lg"),     "attributeId": to_oid("attr-size-hoodie"), "value": "L",      "displayMeta": None},
]
PROD_HOODIE = {
    "_id": to_oid("prod-hoodie"),
    "title": "CloudSoft Fleece Hoodie",
    "slug": "cloudsoft-fleece-hoodie",
    "description": "Premium 350 GSM cotton-blend fleece hoodie with brushed interior for warmth.",
    "categoryId": SUB_MEN_CLOTHING["_id"],
    "brand": "CloudSoft",
    "basePrice": 3490,
    "discountType": "FLAT",
    "discountValue": 500,
    "discountStartAt": now() - timedelta(days=5),
    "discountEndAt": now() + timedelta(days=10),
    "status": "PUBLISHED",
    "codEligible": True,
    "weight": 480,
    "material": "Cotton Blend",
    "tags": [],
    "images": [
        {"url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80&auto=format&fit=crop", "sortOrder": 0, "isPrimary": True},
        {"url": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80&auto=format&fit=crop", "sortOrder": 1, "isPrimary": False},
    ],
    "attributes": [hoodie_color_attr, {"_id": to_oid("attr-size-hoodie"), "name": "Size", "isGlobal": True}],
    "attributeValues": hoodie_attr_values,
    # Red/Small: started at 1, sold 1 in Order A → stock = 0 (demonstrates Out-of-Stock)
    "variants": [
        {"_id": to_oid("var-hd-red-sm"), "sku": "HD-RED-S", "stockQuantity": 0, "priceOverride": None, "imageUrl": None, "attributeValues": [hoodie_attr_values[0]["_id"], hoodie_attr_values[2]["_id"]]},
        {"_id": to_oid("var-hd-red-md"), "sku": "HD-RED-M", "stockQuantity": 4, "priceOverride": None, "imageUrl": None, "attributeValues": [hoodie_attr_values[0]["_id"], hoodie_attr_values[3]["_id"]]},
        {"_id": to_oid("var-hd-navy-lg"), "sku": "HD-NV-L", "stockQuantity": 6, "priceOverride": None, "imageUrl": None, "attributeValues": [hoodie_attr_values[1]["_id"], hoodie_attr_values[4]["_id"]]},
    ],
    "isFeatured": False,
    "featuredRank": None,
    "featuredStartAt": None,
    "featuredEndAt": None,
    "createdAt": now() - timedelta(days=15),
    "updatedAt": now() - timedelta(days=5),
}

# Product 3: Ceramic Mug (Home > Kitchen) — plenty of stock, featured
mug_color_attr = {"_id": to_oid("attr-color-mug"), "name": "Color", "isGlobal": True}
mug_attr_values = [
    {"_id": to_oid("av-mg-mint"),  "attributeId": mug_color_attr["_id"], "value": "Mint",   "displayMeta": "#a7f3d0"},
    {"_id": to_oid("av-mg-cream"), "attributeId": mug_color_attr["_id"], "value": "Cream",  "displayMeta": "#fef3c7"},
]
PROD_MUG = {
    "_id": to_oid("prod-mug"),
    "title": "Mornings Ceramic Mug 350ml",
    "slug": "mornings-ceramic-mug-350ml",
    "description": "Hand-finished stoneware mug with a soft matte glaze. 350ml capacity, dishwasher and microwave safe.",
    "categoryId": SUB_KITCHEN["_id"],
    "brand": "Mornings",
    "basePrice": 890,
    "discountType": None,
    "discountValue": 0,
    "discountStartAt": None,
    "discountEndAt": None,
    "status": "PUBLISHED",
    "codEligible": True,
    "weight": 350,
    "material": "Stoneware",
    "tags": [],
    "images": [
        {"url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80&auto=format&fit=crop", "sortOrder": 0, "isPrimary": True},
    ],
    "attributes": [mug_color_attr],
    "attributeValues": mug_attr_values,
    "variants": [
        {"_id": to_oid("var-mg-mint"),  "sku": "MG-MINT",  "stockQuantity": 24, "priceOverride": None, "imageUrl": None, "attributeValues": [mug_attr_values[0]["_id"]]},
        {"_id": to_oid("var-mg-cream"), "sku": "MG-CREAM", "stockQuantity": 18, "priceOverride": None, "imageUrl": None, "attributeValues": [mug_attr_values[1]["_id"]]},
    ],
    "isFeatured": True,
    "featuredRank": 3,
    "featuredStartAt": None,
    "featuredEndAt": None,
    "createdAt": now() - timedelta(days=10),
    "updatedAt": now() - timedelta(days=1),
}

# Product 4: Phone Case (Electronics > Wearables — actually Accessories but we use Wearables for demo)
# Clear variant has 0 stock to demonstrate Out-of-Stock UI
case_color_attr = {"_id": to_oid("attr-color-case"), "name": "Color", "isGlobal": True}
case_attr_values = [
    {"_id": to_oid("av-pc-clear"),  "attributeId": case_color_attr["_id"], "value": "Clear",  "displayMeta": "#e5e7eb"},
    {"_id": to_oid("av-pc-black"),  "attributeId": case_color_attr["_id"], "value": "Black",  "displayMeta": "#111827"},
]
PROD_CASE = {
    "_id": to_oid("prod-case"),
    "title": "ShieldPro Phone Case (Universal Fit)",
    "slug": "shieldpro-phone-case-universal",
    "description": "Slim shock-absorbing TPU case with raised camera bezel and anti-yellowing coating.",
    "categoryId": SUB_WEARABLES["_id"],
    "brand": "ShieldPro",
    "basePrice": 1290,
    "discountType": "PERCENT",
    "discountValue": 10,
    "discountStartAt": now() - timedelta(days=1),
    "discountEndAt": now() + timedelta(days=7),
    "status": "PUBLISHED",
    "codEligible": True,
    "weight": 50,
    "material": "TPU",
    "tags": [],
    "images": [
        {"url": "https://images.unsplash.com/photo-1592434134753-a70baf7979d5?w=800&q=80&auto=format&fit=crop", "sortOrder": 0, "isPrimary": True},
    ],
    "attributes": [case_color_attr],
    "attributeValues": case_attr_values,
    "variants": [
        # Clear: 0 stock — demonstrates Out-of-Stock UI
        {"_id": to_oid("var-pc-clear"), "sku": "PC-CLR", "stockQuantity": 0, "priceOverride": None, "imageUrl": None, "attributeValues": [case_attr_values[0]["_id"]]},
        {"_id": to_oid("var-pc-black"), "sku": "PC-BLK", "stockQuantity": 12, "priceOverride": None, "imageUrl": None, "attributeValues": [case_attr_values[1]["_id"]]},
    ],
    "isFeatured": False,
    "featuredRank": None,
    "featuredStartAt": None,
    "featuredEndAt": None,
    "createdAt": now() - timedelta(days=5),
    "updatedAt": now() - timedelta(days=1),
}

# Product 5: Silk Scarf (Fashion > Women's Clothing) — for Order C (pending)
scarf_color_attr = {"_id": to_oid("attr-color-scarf"), "name": "Color", "isGlobal": True}
scarf_attr_values = [
    {"_id": to_oid("av-sc-rose"),   "attributeId": scarf_color_attr["_id"], "value": "Rose",   "displayMeta": "#fda4af"},
    {"_id": to_oid("av-sc-emerald"), "attributeId": scarf_color_attr["_id"], "value": "Emerald", "displayMeta": "#10b981"},
]
PROD_SCARF = {
    "_id": to_oid("prod-scarf"),
    "title": "Luxe Silk Scarf",
    "slug": "luxe-silk-scarf",
    "description": "100% pure mulberry silk scarf with hand-rolled edges. Lightweight and breathable.",
    "categoryId": SUB_WOMEN_CLOTHING["_id"],
    "brand": "Luxe",
    "basePrice": 2190,
    "discountType": None,
    "discountValue": 0,
    "discountStartAt": None,
    "discountEndAt": None,
    "status": "PUBLISHED",
    "codEligible": True,
    "weight": 80,
    "material": "Pure Silk",
    "tags": [],
    "images": [
        {"url": "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80&auto=format&fit=crop", "sortOrder": 0, "isPrimary": True},
    ],
    "attributes": [scarf_color_attr],
    "attributeValues": scarf_attr_values,
    "variants": [
        {"_id": to_oid("var-sc-rose"), "sku": "SC-ROSE", "stockQuantity": 5, "priceOverride": None, "imageUrl": None, "attributeValues": [scarf_attr_values[0]["_id"]]},
        {"_id": to_oid("var-sc-emerald"), "sku": "SC-EMR", "stockQuantity": 3, "priceOverride": None, "imageUrl": None, "attributeValues": [scarf_attr_values[1]["_id"]]},
    ],
    "isFeatured": False,
    "featuredRank": None,
    "featuredStartAt": None,
    "featuredEndAt": None,
    "createdAt": now() - timedelta(days=3),
    "updatedAt": now() - timedelta(days=1),
}

PRODUCTS = [PROD_EARBUDS, PROD_HOODIE, PROD_MUG, PROD_CASE, PROD_SCARF]

# =========== ORDERS (3 orders — full workflow) ===========
# Order A: DELIVERED — Hoodie Red/Small ×1. Stock was 1, now 0. Buyer left a 5-star review.
ORDER_A = {
    "_id": to_oid("order-a"),
    "userId": DEMO_BUYER["_id"],
    "addressId": DEMO_ADDRESS["_id"],
    "status": "DELIVERED",
    "paymentMethod": "COD",
    "paymentStatus": "PAID",
    "codRequestId": None,
    "items": [{
        "variantId": to_oid("var-hd-red-sm"),
        "productId": to_oid("prod-hoodie"),
        "title": "CloudSoft Fleece Hoodie",
        "variantLabel": "Red / S",
        "quantity": 1,
        "priceAtPurchase": 2990,
    }],
    "subtotal": 3490,
    "discountAmount": 500,
    "shippingFee": 0,
    "tax": 0,
    "total": 2990,
    "trackingNumber": "",
    "courierName": "",
    "deliveredAt": now() - timedelta(days=2),
    "cancelledAt": None,
    "createdAt": now() - timedelta(days=8),
    "updatedAt": now() - timedelta(days=2),
}

# Order B: SHIPPED — Earbuds Black ×2. Stock was 5, now 3. Chat active; seller sent an unread message.
ORDER_B = {
    "_id": to_oid("order-b"),
    "userId": DEMO_BUYER["_id"],
    "addressId": DEMO_ADDRESS["_id"],
    "status": "SHIPPED",
    "paymentMethod": "COD",
    "paymentStatus": "PENDING",
    "codRequestId": None,
    "items": [{
        "variantId": to_oid("var-eb-black"),
        "productId": to_oid("prod-earbuds"),
        "title": "AuraBeat Pro Wireless Earbuds",
        "variantLabel": "Black",
        "quantity": 2,
        "priceAtPurchase": 6792,
    }],
    "subtotal": 15980,
    "discountAmount": 2397,
    "shippingFee": 0,
    "tax": 0,
    "total": 13583,
    "trackingNumber": "",
    "courierName": "",
    "deliveredAt": None,
    "cancelledAt": None,
    "createdAt": now() - timedelta(days=3),
    "updatedAt": now() - timedelta(days=1),
}

# Order C: PENDING SELLER APPROVAL — Silk Scarf Rose ×1.
# Stock NOT decremented (new COD logic). Demonstrates "COD · Pending" label.
COD_REQUEST_C = {
    "_id": to_oid("cod-request-c"),
    "userId": DEMO_BUYER["_id"],
    "addressId": DEMO_ADDRESS["_id"],
    "status": "PENDING_SELLER_APPROVAL",
    "items": [{
        "variantId": to_oid("var-sc-rose"),
        "productId": to_oid("prod-scarf"),
        "title": "Luxe Silk Scarf",
        "variantLabel": "Rose",
        "quantity": 1,
        "priceAtRequest": 2190,
    }],
    "subtotal": 2190,
    "discountAmount": 0,
    "total": 2190,
    "rejectionReason": "",
    # PRD_New: stock NOT held at creation
    "stockHeldUntil": None,
    "orderId": None,
    "createdAt": now() - timedelta(hours=6),
    "decidedAt": None,
    "updatedAt": now() - timedelta(hours=6),
}

ORDERS = [ORDER_A, ORDER_B]

# =========== ORDER MESSAGES (for unread badge testing) ===========
# Order A: fully read conversation (delivered)
ORDER_MESSAGES = [
    {
        "_id": to_oid("msg-1"),
        "orderId": ORDER_A["_id"],
        "senderRole": "SELLER",
        "senderId": DEMO_SELLER["_id"],
        "message": "Hi Ayesha! Your order is on the way.",
        "readAt": None,
        "readByBuyer": True,
        "readBySeller": True,
        "createdAt": now() - timedelta(days=4),
        "updatedAt": now() - timedelta(days=4),
    },
    {
        "_id": to_oid("msg-2"),
        "orderId": ORDER_A["_id"],
        "senderRole": "BUYER",
        "senderId": DEMO_BUYER["_id"],
        "message": "Thank you! Looking forward to it.",
        "readAt": None,
        "readByBuyer": True,
        "readBySeller": True,
        "createdAt": now() - timedelta(days=4),
        "updatedAt": now() - timedelta(days=4),
    },
    # Order B: seller sent a message the buyer hasn't read → unread badge
    {
        "_id": to_oid("msg-3"),
        "orderId": ORDER_B["_id"],
        "senderRole": "SELLER",
        "senderId": DEMO_SELLER["_id"],
        "message": "Your earbuds have been shipped! They should arrive in 2-3 business days.",
        "readAt": None,
        "readByBuyer": False,  # unread → triggers badge
        "readBySeller": True,
        "createdAt": now() - timedelta(days=1),
        "updatedAt": now() - timedelta(days=1),
    },
]

# =========== REVIEWS ===========
# Order A delivered → buyer left a 5-star review on the hoodie
REVIEW_A = {
    "_id": to_oid("review-a"),
    "productId": to_oid("prod-hoodie"),
    "orderId": ORDER_A["_id"],
    "userId": DEMO_BUYER["_id"],
    "rating": 5,
    "comment": "Amazing quality! The fleece is super soft and the fit is perfect. Would buy again.",
    "photos": [],
    "isVerifiedPurchase": True,
    "sellerReply": "Thank you so much, Ayesha! We're glad you love it.",
    "isHidden": False,
    "createdAt": now() - timedelta(days=1),
    "updatedAt": now() - timedelta(days=1),
}
REVIEWS = [REVIEW_A]

# =========== NOTIFICATIONS ===========
NOTIFICATIONS = [
    {
        "_id": to_oid("notif-1"),
        "userId": DEMO_BUYER["_id"],
        "type": "ORDER_DELIVERED",
        "orderId": ORDER_A["_id"],
        "title": "Order delivered",
        "body": "Your order has been delivered. Please leave a review.",
        "isRead": False,
        "createdAt": now() - timedelta(days=2),
        "updatedAt": now() - timedelta(days=2),
    },
    {
        "_id": to_oid("notif-2"),
        "userId": DEMO_BUYER["_id"],
        "type": "ORDER_ACCEPTED",
        "orderId": ORDER_B["_id"],
        "title": "Order confirmed",
        "body": "Your COD order has been accepted by the seller.",
        "isRead": True,
        "createdAt": now() - timedelta(days=3),
        "updatedAt": now() - timedelta(days=3),
    },
    {
        "_id": to_oid("notif-3"),
        "userId": DEMO_BUYER["_id"],
        "type": "ORDER_SHIPPED",
        "orderId": ORDER_B["_id"],
        "title": "Order shipped",
        "body": "Your order has been shipped.",
        "isRead": False,
        "createdAt": now() - timedelta(days=1),
        "updatedAt": now() - timedelta(days=1),
    },
    # Seller notification: new COD request (Order C)
    {
        "_id": to_oid("notif-4"),
        "userId": DEMO_SELLER["_id"],
        "type": "NEW_COD_REQUEST",
        "orderId": None,
        "title": "New COD order request",
        "body": "A buyer has requested COD approval for 1 item(s).",
        "isRead": False,
        "createdAt": now() - timedelta(hours=6),
        "updatedAt": now() - timedelta(hours=6),
    },
]

# =========== BANNERS ===========
BANNERS = [
    {
        "_id": to_oid("banner-1"),
        "imageUrl": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80&auto=format&fit=crop",
        "title": "New season, new sounds",
        "subtitle": "Up to 20% off audio & wearables",
        "ctaText": "",
        "ctaLink": "/products?category=audio",
        "ctaCategory": SUB_AUDIO["_id"],
        "ctaProduct": None,
        "dealQuantity": None,
        "dealDiscountPercent": 20,
        "startAt": now() - timedelta(days=1),
        "endAt": now() + timedelta(days=30),
        "sortOrder": 0,
        "isActive": True,
        "createdAt": now() - timedelta(days=2),
        "updatedAt": now() - timedelta(days=2),
    },
    # Secondary banners (PRD_New §Marketplace.1: auto-scrolling carousel)
    {
        "_id": to_oid("banner-2"),
        "imageUrl": "https://images.unsplash.com/photo-1441986300917-64674bd37d8f?w=1200&q=80&auto=format&fit=crop",
        "title": "Fashion week sale",
        "subtitle": "Fresh styles for every season",
        "ctaText": "",
        "ctaLink": "/products?category=fashion",
        "ctaCategory": CAT_FASHION["_id"],
        "ctaProduct": None,
        "dealQuantity": None,
        "dealDiscountPercent": 15,
        "startAt": now() - timedelta(days=1),
        "endAt": now() + timedelta(days=20),
        "sortOrder": 0,
        "isActive": True,
        "createdAt": now() - timedelta(days=1),
        "updatedAt": now() - timedelta(days=1),
    },
    {
        "_id": to_oid("banner-3"),
        "imageUrl": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop",
        "title": "Cozy home essentials",
        "subtitle": "Mugs, decor, and more",
        "ctaText": "",
        "ctaLink": "/products?category=home-living",
        "ctaCategory": CAT_HOME["_id"],
        "ctaProduct": PROD_MUG["_id"],
        "dealQuantity": 2,
        "dealDiscountPercent": None,
        "startAt": now() - timedelta(days=1),
        "endAt": now() + timedelta(days=25),
        "sortOrder": 0,
        "isActive": True,
        "createdAt": now() - timedelta(days=1),
        "updatedAt": now() - timedelta(days=1),
    },
]

# =========== WISHLIST ===========
WISHLIST = [{
    "_id": to_oid("wish-1"),
    "userId": DEMO_BUYER["_id"],
    "productIds": [to_oid("prod-mug"), to_oid("prod-scarf")],
    "createdAt": now() - timedelta(days=3),
    "updatedAt": now() - timedelta(days=3),
}]

# =========== CART (empty — buyer has checked out) ===========
CART = [{
    "_id": to_oid("cart-1"),
    "userId": DEMO_BUYER["_id"],
    "items": [],
    "createdAt": now() - timedelta(days=30),
    "updatedAt": now() - timedelta(days=1),
}]


def main():
    parser = argparse.ArgumentParser(description="Seed Shopwave demo data (v2 — subcategories + full workflow).")
    parser.add_argument("--mongodb", default=os.environ.get("MONGODB_URI", "mongodb://localhost:27017/ecommerce"))
    parser.add_argument("--db", default=None)
    parser.add_argument("--admin-password", default="admin123")
    parser.add_argument("--buyer-password", default="buyer123")
    parser.add_argument("--keep", action="store_true")
    args = parser.parse_args()

    client = MongoClient(args.mongodb)
    if args.db:
        db = client[args.db]
    else:
        try:
            db = client.get_default_database()
        except Exception:
            db = None
        if db is None:
            db = client["ecommerce"]

    print(f"[Seed] Connected to: {args.mongodb}")
    print(f"[Seed] Database: {db.name}")

    print("[Seed] Hashing passwords with bcrypt (10 rounds)...")
    DEMO_SELLER["passwordHash"] = hash_password(args.admin_password)
    DEMO_BUYER["passwordHash"]  = hash_password(args.buyer_password)

    # Stock sync explanation:
    # - Earbuds Black: 5 → 3 (Order B sold 2, accepted by seller → stock decremented at accept)
    # - Hoodie Red/Small: 1 → 0 (Order A sold 1, accepted → stock decremented at accept)
    # - Scarf Rose: 5 (Order C is PENDING — stock NOT decremented per new COD logic)
    # These post-order values are already set in the variant.stockQuantity fields above.

    collections_to_seed = [
        "users", "addresses", "categories", "products", "carts", "wishlists",
        "orders", "codrequests", "ordermessages", "notifications", "banners",
        "reviews",
    ]
    if not args.keep:
        print("[Seed] Wiping existing collections...")
        for name in collections_to_seed:
            db[name].delete_many({})
            print(f"  - cleared {name}")

    print("[Seed] Inserting demo data...")
    db["users"].insert_many([DEMO_SELLER, DEMO_BUYER])
    db["addresses"].insert_many([DEMO_ADDRESS])
    db["categories"].insert_many(CATEGORIES)
    db["products"].insert_many(PRODUCTS)
    db["carts"].insert_many(CART)
    db["wishlists"].insert_many(WISHLIST)
    db["orders"].insert_many(ORDERS)
    db["codrequests"].insert_many([COD_REQUEST_C])
    db["notifications"].insert_many(NOTIFICATIONS)
    db["banners"].insert_many(BANNERS)
    db["ordermessages"].insert_many(ORDER_MESSAGES)
    db["reviews"].insert_many(REVIEWS)

    # Indexes
    print("[Seed] Ensuring indexes...")
    db["users"].create_index("email", unique=True)
    db["users"].create_index("role")
    db["products"].create_index("slug", unique=True)
    db["products"].create_index("categoryId")
    db["products"].create_index([("title", "text"), ("description", "text")])
    db["orders"].create_index("userId")
    db["orders"].create_index("status")
    db["ordermessages"].create_index([("orderId", 1), ("senderRole", 1), ("readByBuyer", 1)])
    db["ordermessages"].create_index([("orderId", 1), ("senderRole", 1), ("readBySeller", 1)])
    db["notifications"].create_index([("userId", 1), ("isRead", 1), ("createdAt", -1)])
    db["categories"].create_index("slug", unique=True)
    db["categories"].create_index("parentCategoryId")

    print("\n[Seed] Done. Summary:")
    print(f"  Users         : {db['users'].count_documents({})}  (1 admin + 1 buyer)")
    print(f"  Addresses     : {db['addresses'].count_documents({})}")
    print(f"  Categories    : {db['categories'].count_documents({})}  (3 top-level + 5 subcategories)")
    print(f"  Products      : {db['products'].count_documents({})}")
    print(f"  Variants      : {sum(len(p.get('variants', [])) for p in db['products'].find())}")
    print(f"  Orders        : {db['orders'].count_documents({})}  (1 DELIVERED + 1 SHIPPED)")
    print(f"  COD Requests  : {db['codrequests'].count_documents({})}  (1 PENDING - stock not decremented)")
    print(f"  Order Messages: {db['ordermessages'].count_documents({})}  (1 unread -> tests badge)")
    print(f"  Reviews       : {db['reviews'].count_documents({})}  (1 verified review on delivered order)")
    print(f"  Banners       : {db['banners'].count_documents({})}  (1 primary + 2 secondary for carousel)")
    print(f"  Notifications : {db['notifications'].count_documents({})}")
    print(f"  Cart          : {db['carts'].count_documents({})}  (empty)")
    print(f"  Wishlist      : {db['wishlists'].count_documents({})}  (2 products saved)")

    print("\n[Seed] Demo credentials:")
    print(f"  Admin : {DEMO_SELLER['email']} / {args.admin_password}")
    print(f"  Buyer : {DEMO_BUYER['email']} / {args.buyer_password}")

    print("\n[Seed] Stock sync verification (post-order state):")
    for p in PRODUCTS:
        for v in p.get("variants", []):
            print(f"  {p['title'][:30]:32}  {v['sku']:12}  stock={v['stockQuantity']}")
    print("\nNotes:")
    print("  - Earbuds Black: started at 5, sold 2 in Order B (decremented at seller accept)")
    print("  - Hoodie Red/Small: started at 1, sold 1 in Order A (decremented at seller accept) -> OUT OF STOCK")
    print("  - Phone Case Clear: started at 0 -> demonstrates Out-of-Stock UI")
    print("  - Scarf Rose: 5 in stock - Order C is PENDING, stock NOT decremented (new COD logic)")
    print("  - Order B has 1 unread seller message -> buyer sees a notification badge")


if __name__ == "__main__":
    main()
