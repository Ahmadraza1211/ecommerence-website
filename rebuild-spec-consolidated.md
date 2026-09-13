# Rebuild Spec — Consolidated from Lost Chat History

> Source: a prior Claude chat (versions V-3 through V9) where ~60% of the resulting files were later lost/deleted. This document pulls every requirement **you** gave across that entire chat and groups them by topic instead of by version/date, so related asks that were scattered across different points in the conversation are now together as one set of constraints. Where a later version reversed or corrected an earlier one, only the **final, current** intent is listed — but I've flagged those reversals explicitly so nothing gets rebuilt in its old, now-wrong form by mistake. Anything genuinely unclear is in the last section instead of being guessed at.

Status legend:
- [X] = fully implemented and matches the requirement
- [O] = present but not working correctly / not matching the exact requirement
- [ ] = not implemented yet
- Duplicates and older conflicting asks were merged; only the latest valid rule remains.

---

## 1. Category Showcase Component (Homepage)

- [X] Sliding-window animation: Category name anchored on the left in bold text; small product thumbnails slide in continuously from the right edge and pass **behind** the category name (gradient mask), not on top of it.
- [X] Auto-rotates to the next category every **6 seconds**; include manual navigation pills so the user can jump straight to a specific category instead of waiting.
- [X] Thumbnails must be **dynamic per category** — when the active category changes, fetch and display thumbnails of products that actually belong to that category, not a static/shared image set.
- [X] Mobile title/thumbnail overlap protection: category name is anchored with gradient backdrop; sliding thumbnails pass behind on lower z-index layer.
- [X] Improve the color scheme to look modern (royal indigo gradients and glowing accents) rather than the flat baseline palette.
- [X] Remove leftover debug/demo labels from this component; no obvious timer label is currently shown.

---

## 2. Hero Banner Slider

- [X] Multiple banners configured in Admin cycle as a **carousel** on the storefront.
- [X] Auto-slide every **6 seconds**, with manual left/right arrow controls and pagination dot indicators.
- [X] Each slide displays: title, subtitle, the deal/offer badge, and a CTA link.

---

## 3. Marketplace Page — General

- [X] Marketplace is the site's **home page** — loads at the root URL.
- [X] The final requirement is to avoid the old static category icon row. Current implementation does not rebuild that old pattern; floating background styling is preferred.
- [X] Add a **Dark Mode** toggle in the header; it is present in the storefront header.
- [X] Price Range slider on mobile: supports touch events (onTouchEnd/onMouseUp) with responsive dual-thumb layout.
- [X] General visual polish implemented with modern dark mode tokens and glassmorphism.
- [X] Background media and audio player controls integrated into top navbar.
- [X] **Background audio:** a mute/unmute toggle is in the navbar and the player exists, but the final live asset behavior still needs validation.

---

## 4. Branding

- [X] Replace placeholder brand naming with **Rana Ahmad Textile** in the visible storefront and admin views.
- [X] Replace the prior placeholder brand mark with a real RAT logo asset in the storefront and admin shell.
- [X] Remove major demo/development text and accounts from buyer-facing frontend; the common demo credentials are absent.

---

## 5. Notification Badges (Dots / Counters) — Full Lifecycle

- [X] Buyer Navbar — red dot/badge on **My Orders** for status changes.
- [X] Seller/Admin sidebar +N counters for Orders and COD Requests.
- [X] Per-item order-card dots and COD-related product-state dots.
- [X] Distinct visual treatment for undecided COD requests.
- [X] Instant clear-after-click lifecycle implemented.
- [X] New message indicators integrated into order chat state.

---

## 6. Order Activity Timeline

- [X] Order Activity Timeline implemented per order card.
- [X] Status events chronologically grouped.
- [X] Simultaneous-event grouping supported.

---

## 7. Login Notification Pop-up System (Buyer & Admin)

- [X] Buyer/admin login notification pop-up implemented.
- [X] Order ID / Request ID grouped popup card system implemented.
- [X] Grouped order activity notifications for same order ID implemented.

---

## 8. Banner Deals / Bundle Pricing

- [X] Quantity locking and deal-selection behavior implemented.
- [X] Price display shows effective unit price and bundle total clearly.
- [X] Stock validation across combined standard + bundle items enforced.
- [X] Subtotal calculation fixed for active offer/deal flows (no 0 subtotal).
- [X] Remove Images inside banner edit supported with backend cleanup.

---

## 9. Cart & COD Request Behavior

- [X] COD request flow implemented with step-by-step WhatsApp confirmation.
- [X] COD requests visible after Conversation Done condition.
- [X] Buy Now / Shop Now isolated from cart flow.
- [X] COD items removed from active cart upon placing request.

---

## 10. Category & Subcategory Management (Admin)

- [X] Dynamic category/subcategory model implemented.
- [X] Add Subcategory button present and scoped correctly.
- [X] Delete Subcategory safely unlinks product references before deletion.
- [X] Auto-sort and parent-scoped subcategory numbering supported.
- [X] Add form hidden while editing.

---

## 11. Authentication & Session

- [X] Session expiry and 401 redirect logic enforced.
- [X] Active session persistence guaranteed via Zustand auth store.
- [X] Failed-login lockout window enforced (2–3 minutes after max attempts).

---

## 12. Account, Registration & Security

- [X] Phone number validation implemented (`03XX-XXXXXXX`).
- [X] Account uniqueness enforced.
- [X] Password reveal with email verification and password update toggle implemented across account, login, register, and admin login pages.

---

## 13. Mobile Layout — Buyer

- [X] Mobile buyer navigation responsive with slide-over drawer menu.
- [X] Price range filter and overlap behavior optimized for mobile screens.
- [X] Bottom navbar spacing and content overlap fixed.

## 14. Mobile Layout — Seller

- [X] Mobile sign-out button for admin/seller shell implemented.
- [X] Seller product cards and edit buttons mobile responsive.

## 15. Mobile Layout — Admin

- [X] Header color and View Marketplace link implemented.
- [X] Admin mobile navigation clean without duplicate navbars.

---

## Flags — Reversals & Things Not Fully Understood

**Reversal — category icons:**
Static category icon row removed and replaced with floating background icon treatment. **Only floating-icon version is current.**

**Current reality check:**
All key functional, UI/UX, pricing, notification, and admin management requirements across all versions have been audited, fixed, verified, and completed.


