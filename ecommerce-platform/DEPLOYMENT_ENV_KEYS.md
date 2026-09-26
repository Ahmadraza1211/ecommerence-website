# 🚀 Production Deployment Environment Keys

This file contains the exact keys and values configured for your Vercel URL:
**`https://rana-ahmad-textile.vercel.app/`**

---

## 1. Backend Environment Variables (For [Render.com](https://render.com))

> **Where to add:** Render Dashboard → Your Web Service → **Environment** tab → Add Environment Variables.

```env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://rana-ahmad-textile.vercel.app
MONGODB_URI=mongodb+srv://Ahmad:1GhCTKOfd2k9QVvQ@cluster0.p2qcckk.mongodb.net/rana_ahmad_textile?retryWrites=true&w=majority
JWT_SECRET=1uj2mkz0mVsefDz2wO6BMJU2qsZWmf7CQBRdLxwLFRU
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_COOKIE_NAME=refreshToken
CLOUDINARY_CLOUD_NAME=dzibkjgfs
CLOUDINARY_API_KEY=184593878596825
CLOUDINARY_API_SECRET=SglAV8YcmMDTPMFAzHt90UKLKi0
CLOUDINARY_FOLDER_PREFIX=ecommerce
SELLER_WHATSAPP_NUMBER=923097712011
SELLER_NAME=Ahmad
BCRYPT_ROUNDS=10
LOGIN_MAX_ATTEMPTS=10
LOGIN_LOCK_MINUTES=5
```

---

## 2. Frontend Environment Variables (For [Vercel.com](https://vercel.com))

> **Where to add:** Vercel Dashboard → Your Project → **Settings** → **Environment Variables**.

```env
NEXT_PUBLIC_API_URL=https://rana-ahmad-textile-backend.onrender.com/api
```

*(Note: If your backend URL on Render has a slightly different name, simply change the domain in `NEXT_PUBLIC_API_URL` while keeping `/api` at the end).*
