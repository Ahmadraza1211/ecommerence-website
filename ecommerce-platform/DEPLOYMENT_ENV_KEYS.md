# ⚡ Complete Vercel Deployment Guide (Frontend + Backend)

Deploying both your **Frontend** and **Backend** on Vercel provides instant loading, eliminates CORS issues, and removes the 50-second sleep timeouts from Render free tier.

---

## ⚠️ Important Pre-requisite: MongoDB Atlas Network Access
Before deploying on Vercel, make sure MongoDB Atlas allows connections from anywhere:
1. Go to **[MongoDB Atlas](https://cloud.mongodb.com)** → **Network Access**.
2. Click **Add IP Address**.
3. Select **Allow Access From Anywhere** (`0.0.0.0/0`).
4. Click **Confirm**.

---

## 📦 Project 1: Backend Deployment on Vercel

1. In **[Vercel Dashboard](https://vercel.com)**, click **Add New...** → **Project**.
2. Import your repository: `https://github.com/Ahmadraza1211/ecommerence-website`.
3. In **Root Directory**, click Edit and select: `ecommerce-platform/backend`
4. In **Project Name**, enter: `rana-ahmad-textile-backend` (or your preferred name).
5. Open **Environment Variables** and add the following keys:

```env
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

6. Click **Deploy**.
7. Once deployed, copy your backend URL (e.g., `https://rana-ahmad-textile-backend.vercel.app`).

---

## 🌐 Project 2: Frontend Deployment on Vercel

1. In **Vercel Dashboard**, click **Add New...** → **Project**.
2. Import the same repository (`ecommerence-website`).
3. In **Root Directory**, click Edit and select: `ecommerce-platform/frontend`
4. In **Project Name**, enter: `rana-ahmad-textile`
5. Open **Environment Variables** and add:

```env
NEXT_PUBLIC_API_URL=https://rana-ahmad-textile-backend.vercel.app/api
```
*(Replace `https://rana-ahmad-textile-backend.vercel.app` with the exact backend URL assigned by Vercel in Project 1 above).*

6. Click **Deploy**.

---

## 🧪 Testing Your Live Site
- Open `https://rana-ahmad-textile.vercel.app/`
- Products, categories, banners, user login, and admin panel will now load instantly at edge speeds without sleeping or cold starts.
