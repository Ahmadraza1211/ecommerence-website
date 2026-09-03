"""
Seed script v3 for Shopwave e-commerce platform.

PRD_New V3 additions:
- Bundle deal banner (with tiers)
- Order events (activity log) for all 3 orders
- Purchase history data (paid/delivered orders)
- Proper subcategory assignments

Run:
    python seed/seed.py --mongodb "mongodb://localhost:27017/ecommerce"
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
    print("Warning: 'bcrypt' not installed.", file=sys.stderr)


def hash_password(plain: str) -> str:
    if HAS_BCRYPT:
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=10)).decode()
    raise RuntimeError("bcrypt is required.")


def now() -> datetime:
    return datetime.now(timezone.utc)


def oid(seed: str):
    try:
        from bson import ObjectId
        return ObjectId(hashlib.sha256(seed.encode()).hexdigest()[:24])
    except ImportError:
        return hashlib.sha256(seed.encode()).hexdigest()[:24]


# =========== USERS ===========
SELLER = {"_id": oid("seller"), "name": "Shopwave Admin", "email": "admin@shopwave.demo", "phone": "+923001234567", "passwordHash": "", "role": "ADMIN", "avatarUrl": "https://placehold.co/200x200/0f172a/ffffff?text=Admin", "isVerified": True, "failedLoginAttempts": 0, "lockUntil": None, "createdAt": now() - timedelta(days=60), "updatedAt": now() - timedelta(days=60)}
BUYER = {"_id": oid("buyer"), "name": "Ayesha Khan", "email": "buyer@shopwave.demo", "phone": "+923331234567", "passwordHash": "", "role": "BUYER", "avatarUrl": "https://placehold.co/200x200/e11d48/ffffff?text=A", "isVerified": True, "failedLoginAttempts": 0, "lockUntil": None, "createdAt": now() - timedelta(days=30), "updatedAt": now() - timedelta(days=30)}
ADDRESS = {"_id": oid("addr"), "userId": BUYER["_id"], "label": "Home", "fullName": "Ayesha Khan", "phone": "+923331234567", "addressLine": "House 12, Street 4, Gulberg III", "city": "Lahore", "postalCode": "54000", "isDefault": True, "createdAt": now() - timedelta(days=30), "updatedAt": now() - timedelta(days=30)}

# =========== CATEGORIES + SUBCATEGORIES ===========
CAT_ELEC = {"_id": oid("cat-elec"), "name": "Electronics", "slug": "electronics", "parentCategoryId": None, "imageUrl": "", "sortOrder": 1, "isActive": True, "createdAt": now(), "updatedAt": now()}
CAT_FASH = {"_id": oid("cat-fashion"), "name": "Fashion", "slug": "fashion", "parentCategoryId": None, "imageUrl": "", "sortOrder": 2, "isActive": True, "createdAt": now(), "updatedAt": now()}
CAT_HOME = {"_id": oid("cat-home"), "name": "Home & Living", "slug": "home-living", "parentCategoryId": None, "imageUrl": "", "sortOrder": 3, "isActive": True, "createdAt": now(), "updatedAt": now()}
SUB_AUDIO = {"_id": oid("sub-audio"), "name": "Audio", "slug": "audio", "parentCategoryId": CAT_ELEC["_id"], "imageUrl": "", "sortOrder": 1, "isActive": True, "createdAt": now(), "updatedAt": now()}
SUB_MEN = {"_id": oid("sub-men"), "name": "Men's Clothing", "slug": "mens-clothing", "parentCategoryId": CAT_FASH["_id"], "imageUrl": "", "sortOrder": 1, "isActive": True, "createdAt": now(), "updatedAt": now()}
SUB_KITCHEN = {"_id": oid("sub-kitchen"), "name": "Kitchen", "slug": "kitchen", "parentCategoryId": CAT_HOME["_id"], "imageUrl": "", "sortOrder": 1, "isActive": True, "createdAt": now(), "updatedAt": now()}
CATEGORIES = [CAT_ELEC, CAT_FASH, CAT_HOME, SUB_AUDIO, SUB_MEN, SUB_KITCHEN]

# =========== PRODUCTS ===========
ATTR_COLOR = {"_id": oid("attr-color"), "name": "Color", "isGlobal": True}
ATTR_SIZE = {"_id": oid("attr-size"), "name": "Size", "isGlobal": True}

# Product 1: Earbuds (Audio) — Black stock=3 (5-2 sold in Order B), White stock=4
PROD_EARBUDS = {
    "_id": oid("prod-earbuds"), "title": "AuraBeat Pro Wireless Earbuds", "slug": "aurabeat-pro-wireless-earbuds",
    "description": "Truly wireless earbuds with ANC, 30-hour battery, USB-C, IPX5.",
    "categoryId": SUB_AUDIO["_id"], "brand": "AuraBeat", "basePrice": 7990,
    "discountType": "PERCENT", "discountValue": 15, "discountStartAt": now() - timedelta(days=2), "discountEndAt": now() + timedelta(days=14),
    "status": "PUBLISHED", "codEligible": True, "weight": 80, "material": "Plastic", "tags": [],
    "images": [{"url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80&auto=format&fit=crop", "sortOrder": 0, "isPrimary": True}],
    "attributes": [ATTR_COLOR], "attributeValues": [
        {"_id": oid("av-eb-blk"), "attributeId": ATTR_COLOR["_id"], "value": "Black", "displayMeta": "#1f2937"},
        {"_id": oid("av-eb-wht"), "attributeId": ATTR_COLOR["_id"], "value": "White", "displayMeta": "#f8fafc"},
    ],
    "variants": [
        {"_id": oid("var-eb-blk"), "sku": "EB-BLK", "stockQuantity": 3, "priceOverride": None, "imageUrl": None, "attributeValues": [oid("av-eb-blk")]},
        {"_id": oid("var-eb-wht"), "sku": "EB-WHT", "stockQuantity": 4, "priceOverride": None, "imageUrl": None, "attributeValues": [oid("av-eb-wht")]},
    ],
    "isFeatured": True, "featuredRank": 1, "featuredStartAt": now() - timedelta(days=1), "featuredEndAt": now() + timedelta(days=30),
    "createdAt": now() - timedelta(days=20), "updatedAt": now() - timedelta(days=2),
}

# Product 2: Hoodie (Men's) — Red/S stock=0 (1-1 sold in Order A), Red/M stock=4, Navy/L stock=6
PROD_HOODIE = {
    "_id": oid("prod-hoodie"), "title": "CloudSoft Fleece Hoodie", "slug": "cloudsoft-fleece-hoodie",
    "description": "Premium 350 GSM cotton-blend fleece hoodie.",
    "categoryId": SUB_MEN["_id"], "brand": "CloudSoft", "basePrice": 3490,
    "discountType": "FLAT", "discountValue": 500, "discountStartAt": now() - timedelta(days=5), "discountEndAt": now() + timedelta(days=10),
    "status": "PUBLISHED", "codEligible": True, "weight": 480, "material": "Cotton Blend", "tags": [],
    "images": [{"url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80&auto=format&fit=crop", "sortOrder": 0, "isPrimary": True}],
    "attributes": [ATTR_COLOR, ATTR_SIZE], "attributeValues": [
        {"_id": oid("av-hd-red"), "attributeId": ATTR_COLOR["_id"], "value": "Red", "displayMeta": "#dc2626"},
        {"_id": oid("av-hd-navy"), "attributeId": ATTR_COLOR["_id"], "value": "Navy", "displayMeta": "#1e3a8a"},
        {"_id": oid("av-hd-s"), "attributeId": ATTR_SIZE["_id"], "value": "S", "displayMeta": None},
        {"_id": oid("av-hd-m"), "attributeId": ATTR_SIZE["_id"], "value": "M", "displayMeta": None},
        {"_id": oid("av-hd-l"), "attributeId": ATTR_SIZE["_id"], "value": "L", "displayMeta": None},
    ],
    "variants": [
        {"_id": oid("var-hd-red-s"), "sku": "HD-RS", "stockQuantity": 0, "priceOverride": None, "imageUrl": None, "attributeValues": [oid("av-hd-red"), oid("av-hd-s")]},
        {"_id": oid("var-hd-red-m"), "sku": "HD-RM", "stockQuantity": 4, "priceOverride": None, "imageUrl": None, "attributeValues": [oid("av-hd-red"), oid("av-hd-m")]},
        {"_id": oid("var-hd-navy-l"), "sku": "HD-NL", "stockQuantity": 6, "priceOverride": None, "imageUrl": None, "attributeValues": [oid("av-hd-navy"), oid("av-hd-l")]},
    ],
    "isFeatured": False, "featuredRank": None, "featuredStartAt": None, "featuredEndAt": None,
    "createdAt": now() - timedelta(days=15), "updatedAt": now() - timedelta(days=5),
}

# Product 3: Mug (Kitchen) — Mint stock=24, Cream stock=18
PROD_MUG = {
    "_id": oid("prod-mug"), "title": "Mornings Ceramic Mug 350ml", "slug": "mornings-ceramic-mug-350ml",
    "description": "Hand-finished stoneware mug with soft matte glaze.",
    "categoryId": SUB_KITCHEN["_id"], "brand": "Mornings", "basePrice": 890,
    "discountType": None, "discountValue": 0, "discountStartAt": None, "discountEndAt": None,
    "status": "PUBLISHED", "codEligible": True, "weight": 350, "material": "Stoneware", "tags": [],
    "images": [{"url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80&auto=format&fit=crop", "sortOrder": 0, "isPrimary": True}],
    "attributes": [ATTR_COLOR], "attributeValues": [
        {"_id": oid("av-mg-mint"), "attributeId": ATTR_COLOR["_id"], "value": "Mint", "displayMeta": "#a7f3d0"},
        {"_id": oid("av-mg-cream"), "attributeId": ATTR_COLOR["_id"], "value": "Cream", "displayMeta": "#fef3c7"},
    ],
    "variants": [
        {"_id": oid("var-mg-mint"), "sku": "MG-MNT", "stockQuantity": 24, "priceOverride": None, "imageUrl": None, "attributeValues": [oid("av-mg-mint")]},
        {"_id": oid("var-mg-cream"), "sku": "MG-CRM", "stockQuantity": 18, "priceOverride": None, "imageUrl": None, "attributeValues": [oid("av-mg-cream")]},
    ],
    "isFeatured": True, "featuredRank": 3, "featuredStartAt": None, "featuredEndAt": None,
    "createdAt": now() - timedelta(days=10), "updatedAt": now() - timedelta(days=1),
}

PRODUCTS = [PROD_EARBUDS, PROD_HOODIE, PROD_MUG]

# =========== ORDERS ===========
# Order A: DELIVERED — Hoodie Red/S ×1. Stock was 1, now 0. Buyer left a review.
ORDER_A = {
    "_id": oid("order-a"), "userId": BUYER["_id"], "addressId": ADDRESS["_id"],
    "status": "DELIVERED", "paymentMethod": "COD", "paymentStatus": "PAID", "codRequestId": None,
    "items": [{"variantId": oid("var-hd-red-s"), "productId": oid("prod-hoodie"), "title": "CloudSoft Fleece Hoodie", "variantLabel": "Red / S", "quantity": 1, "priceAtPurchase": 2990}],
    "subtotal": 3490, "discountAmount": 500, "shippingFee": 0, "tax": 0, "total": 2990,
    "trackingNumber": "", "courierName": "", "deliveredAt": now() - timedelta(days=2), "cancelledAt": None,
    "createdAt": now() - timedelta(days=8), "updatedAt": now() - timedelta(days=2),
}

# Order B: SHIPPED — Earbuds Black ×2. Stock was 5, now 3. Chat active.
ORDER_B = {
    "_id": oid("order-b"), "userId": BUYER["_id"], "addressId": ADDRESS["_id"],
    "status": "SHIPPED", "paymentMethod": "COD", "paymentStatus": "PENDING", "codRequestId": None,
    "items": [{"variantId": oid("var-eb-blk"), "productId": oid("prod-earbuds"), "title": "AuraBeat Pro Wireless Earbuds", "variantLabel": "Black", "quantity": 2, "priceAtPurchase": 6792}],
    "subtotal": 15980, "discountAmount": 2397, "shippingFee": 0, "tax": 0, "total": 13583,
    "trackingNumber": "", "courierName": "", "deliveredAt": None, "cancelledAt": None,
    "createdAt": now() - timedelta(days=3), "updatedAt": now() - timedelta(days=1),
}

ORDERS = [ORDER_A, ORDER_B]

# =========== ORDER EVENTS (Activity Log) ===========
ORDER_EVENTS = [
    # Order A events (newest first in display, but we insert chronologically)
    {"_id": oid("ev-a1"), "orderId": ORDER_A["_id"], "type": "COD_REQUEST_ACCEPTED", "actorRole": "SELLER", "actorId": SELLER["_id"], "message": "COD request accepted by seller — order confirmed", "metadata": {}, "createdAt": now() - timedelta(days=7)},
    {"_id": oid("ev-a2"), "orderId": ORDER_A["_id"], "type": "ORDER_SHIPPED", "actorRole": "SELLER", "actorId": SELLER["_id"], "message": "Order marked as Shipped by seller", "metadata": {}, "createdAt": now() - timedelta(days=5)},
    {"_id": oid("ev-a3"), "orderId": ORDER_A["_id"], "type": "MESSAGE_SENT", "actorRole": "SELLER", "actorId": SELLER["_id"], "message": "Seller sent a message", "metadata": {}, "createdAt": now() - timedelta(days=4)},
    {"_id": oid("ev-a4"), "orderId": ORDER_A["_id"], "type": "ORDER_DELIVERED", "actorRole": "SELLER", "actorId": SELLER["_id"], "message": "Order marked as Delivered", "metadata": {}, "createdAt": now() - timedelta(days=2)},
    # Order B events
    {"_id": oid("ev-b1"), "orderId": ORDER_B["_id"], "type": "COD_REQUEST_ACCEPTED", "actorRole": "SELLER", "actorId": SELLER["_id"], "message": "COD request accepted by seller — order confirmed", "metadata": {}, "createdAt": now() - timedelta(days=2)},
    {"_id": oid("ev-b2"), "orderId": ORDER_B["_id"], "type": "ORDER_SHIPPED", "actorRole": "SELLER", "actorId": SELLER["_id"], "message": "Order marked as Shipped by seller", "metadata": {}, "createdAt": now() - timedelta(days=1)},
    {"_id": oid("ev-b3"), "orderId": ORDER_B["_id"], "type": "MESSAGE_SENT", "actorRole": "SELLER", "actorId": SELLER["_id"], "message": "Seller sent a message", "metadata": {}, "createdAt": now() - timedelta(hours=12)},
]

# =========== ORDER MESSAGES ===========
ORDER_MESSAGES = [
    {"_id": oid("om-a1"), "orderId": ORDER_A["_id"], "senderRole": "SELLER", "senderId": SELLER["_id"], "message": "Hi Ayesha! Your order is on the way.", "readAt": None, "readByBuyer": True, "readBySeller": True, "createdAt": now() - timedelta(days=4), "updatedAt": now() - timedelta(days=4)},
    {"_id": oid("om-b1"), "orderId": ORDER_B["_id"], "senderRole": "SELLER", "senderId": SELLER["_id"], "message": "Your earbuds have been shipped! They should arrive in 2-3 business days.", "readAt": None, "readByBuyer": False, "readBySeller": True, "createdAt": now() - timedelta(hours=12), "updatedAt": now() - timedelta(hours=12)},
]

# =========== REVIEWS ===========
REVIEW_A = {
    "_id": oid("rev-a"), "productId": oid("prod-hoodie"), "orderId": ORDER_A["_id"], "userId": BUYER["_id"],
    "rating": 5, "comment": "Amazing quality! The fleece is super soft and the fit is perfect.", "photos": [],
    "isVerifiedPurchase": True, "sellerReply": "Thank you so much, Ayesha!", "isHidden": False,
    "createdAt": now() - timedelta(days=1), "updatedAt": now() - timedelta(days=1),
}
REVIEWS = [REVIEW_A]

# =========== NOTIFICATIONS ===========
NOTIFICATIONS = [
    {"_id": oid("n1"), "userId": BUYER["_id"], "type": "ORDER_DELIVERED", "orderId": ORDER_A["_id"], "title": "Order delivered", "body": "Your order has been delivered. Please leave a review.", "isRead": False, "createdAt": now() - timedelta(days=2), "updatedAt": now() - timedelta(days=2)},
    {"_id": oid("n2"), "userId": BUYER["_id"], "type": "ORDER_SHIPPED", "orderId": ORDER_B["_id"], "title": "Order shipped", "body": "Your order has been shipped.", "isRead": False, "createdAt": now() - timedelta(days=1), "updatedAt": now() - timedelta(days=1)},
    {"_id": oid("n3"), "userId": SELLER["_id"], "type": "NEW_COD_REQUEST", "orderId": None, "title": "New COD order request", "body": "A buyer has requested COD approval for 1 item(s).", "isRead": False, "createdAt": now() - timedelta(hours=6), "updatedAt": now() - timedelta(hours=6)},
]

# =========== BANNERS (with bundle deal) ===========
BANNERS = [
    {
        "_id": oid("ban1"), "imageUrl": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80&auto=format&fit=crop",
        "title": "New season, new sounds", "subtitle": "Up to 20% off audio & wearables",
        "ctaText": "", "ctaLink": "/products?category=audio", "ctaCategory": SUB_AUDIO["_id"], "ctaProduct": None,
        "dealQuantity": None, "dealDiscountPercent": None,
        # PRD_New V3: bundle deal tiers
        "bundleTiers": [{"quantity": 2, "discountPercent": 20}, {"quantity": 3, "discountPercent": 30}],
        "startAt": now() - timedelta(days=1), "endAt": now() + timedelta(days=30), "sortOrder": 0, "isActive": True,
        "createdAt": now() - timedelta(days=2), "updatedAt": now() - timedelta(days=2),
    },
    {
        "_id": oid("ban2"), "imageUrl": "https://images.unsplash.com/photo-1441986300917-64674bd37d8f?w=1200&q=80&auto=format&fit=crop",
        "title": "Fashion week sale", "subtitle": "Fresh styles for every season",
        "ctaText": "", "ctaLink": "/products?category=fashion", "ctaCategory": CAT_FASH["_id"], "ctaProduct": None,
        "dealQuantity": None, "dealDiscountPercent": 15, "bundleTiers": [],
        "startAt": now() - timedelta(days=1), "endAt": now() + timedelta(days=20), "sortOrder": 0, "isActive": True,
        "createdAt": now() - timedelta(days=1), "updatedAt": now() - timedelta(days=1),
    },
]

# =========== WISHLIST, CART ===========
WISHLIST = [{"_id": oid("wish"), "userId": BUYER["_id"], "productIds": [oid("prod-mug")], "createdAt": now() - timedelta(days=3), "updatedAt": now() - timedelta(days=3)}]
CART = [{"_id": oid("cart"), "userId": BUYER["_id"], "items": [], "createdAt": now() - timedelta(days=30), "updatedAt": now() - timedelta(days=1)}]


def main():
    parser = argparse.ArgumentParser(description="Seed Shopwave demo data (v3)")
    parser.add_argument("--mongodb", default=os.environ.get("MONGODB_URI", "mongodb://localhost:27017/ecommerce"))
    parser.add_argument("--db", default=None)
    parser.add_argument("--admin-password", default="admin123")
    parser.add_argument("--buyer-password", default="buyer123")
    parser.add_argument("--keep", action="store_true")
    args = parser.parse_args()

    client = MongoClient(args.mongodb)
    db = client[args.db] if args.db else (client.get_default_database() or client["ecommerce"])
    print(f"[Seed v3] Database: {db.name}")

    SELLER["passwordHash"] = hash_password(args.admin_password)
    BUYER["passwordHash"] = hash_password(args.buyer_password)

    collections = ["users", "addresses", "categories", "products", "carts", "wishlists", "orders", "codrequests", "ordermessages", "notifications", "banners", "reviews", "orderevents"]
    if not args.keep:
        for name in collections:
            db[name].delete_many({})

    db["users"].insert_many([SELLER, BUYER])
    db["addresses"].insert_many([ADDRESS])
    db["categories"].insert_many(CATEGORIES)
    db["products"].insert_many(PRODUCTS)
    db["carts"].insert_many(CART)
    db["wishlists"].insert_many(WISHLIST)
    db["orders"].insert_many(ORDERS)
    db["ordermessages"].insert_many(ORDER_MESSAGES)
    db["orderevents"].insert_many(ORDER_EVENTS)
    db["notifications"].insert_many(NOTIFICATIONS)
    db["banners"].insert_many(BANNERS)
    db["reviews"].insert_many(REVIEWS)

    # Indexes
    db["users"].create_index("email", unique=True)
    db["products"].create_index("slug", unique=True)
    db["products"].create_index("categoryId")
    db["products"].create_index([("title", "text"), ("description", "text")])
    db["orders"].create_index("userId")
    db["orders"].create_index("status")
    db["orderevents"].create_index([("orderId", 1), ("createdAt", -1)])
    db["ordermessages"].create_index([("orderId", 1), ("senderRole", 1), ("readByBuyer", 1)])
    db["ordermessages"].create_index([("orderId", 1), ("senderRole", 1), ("readBySeller", 1)])
    db["notifications"].create_index([("userId", 1), ("isRead", 1), ("createdAt", -1)])
    db["categories"].create_index("slug", unique=True)
    db["categories"].create_index("parentCategoryId")

    print(f"\n[Seed v3] Done. Summary:")
    print(f"  Users: {db['users'].count_documents({})} (1 admin + 1 buyer)")
    print(f"  Categories: {db['categories'].count_documents({})} (3 top + 3 sub)")
    print(f"  Products: {db['products'].count_documents({})}")
    print(f"  Orders: {db['orders'].count_documents({})} (1 DELIVERED + 1 SHIPPED)")
    print(f"  Order Events: {db['orderevents'].count_documents({})} (activity log)")
    print(f"  Order Messages: {db['ordermessages'].count_documents({})} (1 unread)")
    print(f"  Reviews: {db['reviews'].count_documents({})}")
    print(f"  Banners: {db['banners'].count_documents({})} (1 with bundle deal tiers)")
    print(f"  Notifications: {db['notifications'].count_documents({})}")
    print(f"\n  Admin: {SELLER['email']} / {args.admin_password}")
    print(f"  Buyer: {BUYER['email']} / {args.buyer_password}")


if __name__ == "__main__":
    main()
