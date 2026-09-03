"""
Wipe ALL demo data from MongoDB AND Cloudinary.

This script deletes every document from every collection used by the
Shopwave platform, and also deletes all uploaded images from Cloudinary
(under the configured CLOUDINARY_FOLDER_PREFIX).

Usage:
    python seed/wipe_all.py --mongodb "mongodb://localhost:27017/ecommerce"

Required env vars (read from backend/.env or shell):
    CLOUDINARY_CLOUD_NAME
    CLOUDINARY_API_KEY
    CLOUDINARY_API_SECRET
    CLOUDINARY_FOLDER_PREFIX  (default: ecommerce)

The script is safe to re-run — it wipes everything and reports counts.
"""
from __future__ import annotations

import argparse
import os
import sys
import importlib.util
from pathlib import Path

try:
    from pymongo import MongoClient
except ImportError:
    print("Missing 'pymongo'. Install with: pip install pymongo", file=sys.stderr)
    raise

# Collections used by the platform (must match backend/src/models/*)
COLLECTIONS = [
    "users", "addresses", "categories", "products", "carts", "wishlists",
    "orders", "codrequests", "ordermessages", "notifications", "banners",
    "reviews",
]


def load_env_file(path: Path) -> None:
    """Load a .env file into os.environ without overwriting existing values."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip()
        if k and k not in os.environ:
            os.environ[k] = v


def wipe_mongodb(uri: str, db_name: str | None) -> dict:
    client = MongoClient(uri)
    if db_name:
        db = client[db_name]
    else:
        try:
            db = client.get_default_database()
        except Exception:
            db = None
        if db is None:
            db = client["ecommerce"]
    counts = {}
    for name in COLLECTIONS:
        result = db[name].delete_many({})
        counts[name] = result.deleted_count
        print(f"  [MongoDB] {name}: deleted {result.deleted_count} document(s)")
    # Drop text indexes too so re-seeding starts clean
    for name in ["products", "categories", "users"]:
        try:
            db[name].drop_indexes()
        except Exception:
            pass
    print(f"[MongoDB] Done. Database: {db.name}")
    return counts


def wipe_cloudinary() -> int:
    try:
        import cloudinary  # type: ignore
        from cloudinary.api import delete_resources_by_prefix, resource  # type: ignore
    except ImportError:
        print("[Cloudinary] 'cloudinary' package not installed. Skipping Cloudinary wipe.", file=sys.stderr)
        print("            Install with: pip install cloudinary", file=sys.stderr)
        return 0

    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    prefix = os.environ.get("CLOUDINARY_FOLDER_PREFIX", "ecommerce")

    if not (cloud_name and api_key and api_secret):
        print("[Cloudinary] Credentials not found (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).")
        print("[Cloudinary] Skipping Cloudinary wipe. Only MongoDB was wiped.")
        return 0

    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)

    print(f"[Cloudinary] Deleting all resources under prefix '{prefix}/' ...")
    try:
        result = delete_resources_by_prefix(prefix=f"{prefix}/")
        deleted = len(result.get("deleted", {})) if isinstance(result, dict) else 0
        print(f"[Cloudinary] Deleted {deleted} resource(s).")
        return deleted
    except Exception as e:
        print(f"[Cloudinary] Error during wipe: {e}", file=sys.stderr)
        return 0


def main():
    parser = argparse.ArgumentParser(description="Wipe ALL Shopwave demo data (MongoDB + Cloudinary).")
    parser.add_argument("--mongodb", default=os.environ.get("MONGODB_URI", "mongodb://localhost:27017/ecommerce"),
                        help="MongoDB connection string")
    parser.add_argument("--db", default=None, help="Override the database name")
    parser.add_argument("--skip-cloudinary", action="store_true", help="Skip the Cloudinary wipe")
    parser.add_argument("--env-file", default=None,
                        help="Path to a .env file to load credentials from (default: backend/.env next to this script)")
    args = parser.parse_args()

    # Load env file (look for backend/.env by default)
    if args.env_file:
        load_env_file(Path(args.env_file))
    else:
        # Try a few common locations relative to this script
        here = Path(__file__).resolve().parent
        for candidate in [here.parent / "backend" / ".env", here / ".env", here.parent / ".env"]:
            load_env_file(candidate)

    print("=" * 60)
    print("Shopwave — Wipe ALL demo data")
    print("=" * 60)
    print(f"MongoDB URI : {args.mongodb}")
    print(f"Cloudinary  : {os.environ.get('CLOUDINARY_CLOUD_NAME', '(not configured — will skip)')}")
    print()

    print("[1/2] Wiping MongoDB...")
    counts = wipe_mongodb(args.mongodb, args.db)

    if not args.skip_cloudinary:
        print()
        print("[2/2] Wiping Cloudinary...")
        wipe_cloudinary()
    else:
        print()
        print("[2/2] Cloudinary wipe skipped (--skip-cloudinary)")

    print()
    print("=" * 60)
    print("Wipe complete. Summary:")
    total = sum(counts.values())
    print(f"  MongoDB documents deleted : {total}")
    for name, n in counts.items():
        if n > 0:
            print(f"    - {name:20}: {n}")
    print()
    print("Next step: run  python seed/seed.py  to insert fresh demo data.")
    print("=" * 60)


if __name__ == "__main__":
    main()
