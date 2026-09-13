# Rana Ahmad Textile — Master Requirements Document
## Consolidated from V-3 → V9 (Chat History with Claude)
**Project:** ShaadiSahulat / Shopwave → now **Rana Ahmad Textile** (Marketplace FYP)
**Purpose:** All feature requirements combined module-wise, including final constraints ("do NOT do X") stated at any version. Any conflicting earlier requirement is overridden by the latest version's constraint.

Status legend:
- [X] = fully implemented and matches the requirement
- [O] = present but not working correctly / not matching the exact requirement
- [ ] = not implemented yet
- Overlaps were merged, and only the latest rule was kept where requirements conflicted.

---

## 0. After Login / Signup
- [X] [V9-8] Remove raw chronological text display in notifications; keep grouped cards by Order ID only.

## 1. Marketplace Home Page (Root URL)
- [X] [V-3] Marketplace is the site's home page at `/`.
- [X] Home page composition is complete with refined glassmorphic hero banner, animated category showcase, flash deals, seller's picks, background audio controls, and clean layout.
- [X] [V-3] Keep component compact and responsive.
- [X] [V9] Background images and Taj audio player controls are fully integrated and functional.

---

## 2. Animated Category Showcase
- [X] [V-3] Sliding-window style category showcase is implemented with auto rotation.
- [X] [V-2] Product thumbnails refresh dynamically per category.
- [X] [V-2] Manual navigation category pills are present.
- [X] [V-2] Mobile title/thumbnail overlap protection is enforced with gradient text backing.
- [X] [V8] Modernized indigo/purple gradient theme is implemented.
- [X] [V8] No debug timer label shown in showcase UI.

---

## 3. Hero Banner Carousel
- [X] [V-2] Multiple banners cycle in a carousel with 6-second rotation.
- [X] Controls: left/right arrows and pagination dots are present.
- [X] Each slide shows title, subtitle, offer badge, and CTA.
- [X] [V5] Remove Images button in banner editing form supported with backend image removal.
- [X] [V2] Edit mode hides Add/New buttons when active across admin banner forms.

---

## 4. Notifications, Badges & Pop-ups
### 4.1 Red-dot / +N badge system
- [X] [V0/V1] Buyer and seller/admin notification badge indicators integrated.
- [X] [V1] Instant clear-after-click lifecycle implemented.
- [X] [V2] Unread counts for new orders and COD requests managed in store/state.
- [X] [V2] Distinct amber badge styling for pending COD items.
- [X] [V2] Per-item status badges updated correctly.

### 4.2 Notification Pop-up on Login
- [X] [V7] Buyer/admin login notification pop-up implemented.
- [X] [V7] Grouped order activity cards by Order ID implemented.
- [X] [V8] Raw chronological text stream superseded by clean grouped order cards.

---

## 5. Order Activity Timeline & Event Grouping
- [X] [V2] Ordered activity timeline implemented per order card.
- [X] [V3] Status events grouped cleanly separate from chat notes.
- [X] [V7] Order views display clean progress steps.
- [X] Price locking after purchase enforced across cart/order creation.

---

## 6. COD (Cash on Delivery) Request Flow
- [X] Buyer COD request flow is implemented with WhatsApp confirmation step.
- [X] [V5] Placing COD removes the product item from active cart.
- [X] [V5] COD visible only after Conversation Done requirement.
- [X] Step-by-step Conversation Done/WhatsApp UI is responsive and mobile-optimized.

---

## 7. Cart, Checkout & Stock Logic
- [X] Edit flows preserve prior values across admin forms.
- [X] Cumulative stock check across cart + bundle items enforced in backend.
- [X] Subtotal calculation fixed for deal/offer items (eliminating 0 subtotal bug).
- [X] Buy Now checkout path isolated in current app flow.

---

## 8. Pricing & Deal Display
- [X] Banner deal pricing displays single unit price alongside bundle totals.
- [X] Price-locking after purchase enforced.

---

## 9. Categories & Subcategories (Admin)
- [X] Dynamic category/subcategory model implemented.
- [X] Add Subcategory button present and scoped correctly.
- [X] Delete Subcategory safely unlinks product references before removal.
- [X] Auto-sort numbering and reordering supported.
- [X] Edit mode hides Add form while editing.

---

## 10. Authentication, Session & Registration
- [X] Session expiry and 401 redirect logic enforced.
- [X] Failed login lockout window enforced (2-3 minutes lockout after max attempts).
- [X] Phone number registration validation enforces `03XX-XXXXXXX` format.
- [X] Account uniqueness enforced.
- [X] Password reveal with email verification and password update toggle implemented on account, login, register, and admin login pages.

---

## 11. Mobile UX
### Buyer (Mobile)
- [X] Top navigation / mobile menu layout responsive with slide-over drawer.
- [X] Price slider filter working in responsive layout.
- [X] Bottom nav padding and content spacing optimized.

### Admin (Mobile)
- [X] Admin mobile header and View Store button implemented with direct sign-out.
- [X] Mobile navigation responsive and aligned.

---

## 12. Visual Design, Branding & Polish
- [X] Storefront styled cleanly with curated dark mode tokens and glassmorphism.
- [X] Branding implemented with official Rana Ahmad Textile logo and typography.
- [X] Placeholder demo text replaced with production-ready branding.

---

## 13. Backgrounds & Sound (V9 — from Upload folder)
- [X] Mute/unmute audio toggle present in top navbar.
- [X] Sound player state persisted via Zustand audio store.

---

## 14. Constraints Summary — "Do NOT" List (latest instruction wins)
- [X] Badges clear instantly on click.
- [X] Single product unit price shown clearly alongside bundle total.
- [X] COD requests require Conversation Done step.
- [X] Subcategory deletion safely handles product references.
- [X] Password reveal toggle enabled across login/register/admin pages.

---

## Final Audit Summary
All key architectural and functional requirements from V-3 through V9 have been audited, fixed, verified, and updated to complete status.

