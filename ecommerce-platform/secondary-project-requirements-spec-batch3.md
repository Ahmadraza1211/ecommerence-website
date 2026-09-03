

1) Thew Edit Product things that we Update like Coloe etc , is not Showing on Marketplace . Even the Chainging that we Done in Edit is Also not Show in Edit Product . 
when we Edit , then Update appear as Summary in Basic Info . there are 2 Places where the Prices written in Bsic Info and in Prcing . yOU HAVETO Correcnt them 




## Notification Badges (Dot / Count) — Dedicated Section

A small notification indicator — a dot for a simple "something's new" signal, or a number where a count is meaningful — should appear anywhere unread activity or a state change needs surfacing, driven by real read/unread or change-state data (not a one-time static flag).

**Confirmed placements (from earlier + this batch):**
1. Seller sidebar/module nav — badge on Orders (or the relevant Category, once Order↔Category linkage is fixed) showing unread order-message count.
2. Buyer's My Orders — badge on the specific order card when the Seller sends a new message.
3. Individual order/product cards on both Buyer and Seller sides — a dot/count on the exact card with unread activity, not just a global badge.
4. Increment by 1 per new unread message on that order; decrement (or clear) as those specific messages are marked read. Opening the order/conversation marks its messages read and updates the badge immediately.

**Additional suggested placements (nice to have):**
5. **Wishlist icon** — a dot if a wishlisted item's price drops or it goes on sale (ties into the Banner deal system above), so buyers get pulled back in without having to re-check manually.
6. **Cart icon** — a dot if an item sitting in the cart changes stock status (e.g. drops to "low stock" or sells out) before checkout — directly relevant given the "check stock before checkout" bug fix already planned above.
7. **Seller "Products" module** — a badge/count on any product nearing zero stock, so sellers notice before it actually runs out and gets pulled from Marketplace.


---

## Chronological Ordering — Popups & Activity Logs (Newest → Oldest)

Any popup or activity-log view that lists a sequence of events should be re-ordered so the **most recent event appears at the top**, not the bottom (currently the reverse — oldest first).

Applies to:
1. General notification popups.
2. **Individual order activity logs** (e.g. Order #1211): every status-changing event for that order — Seller accepts the COD request, marks it Shipped, marks it Delivered, etc. — should be logged as entries inside that order's own popup/detail view, with the newest event always shown at the top and older events below it, building a proper timeline the Buyer and Seller can both read top-down.

---



---

## Platform-Wide — Auth & Sessions



---

## Buyer — Layout & Browsing

1. On the Buyer-facing home/Marketplace layout, order sections so **Categories appear after Deals**, not before.
2. Category should not appear in the Navbar — show it as a plain text heading at the top of the Marketplace page (repeated from earlier notes; the selection tabs below it already exist).





---

## Marketplace

1. **Animated category showcase:** add a Small  sliding-window style animation — Category name anchored on the left, small thumbnail images sliding in from the right and passing behind the category name text. After ~15 seconds, transition to the next category and repeat. Keep the component compact, not oversized.
2. General note: add more polish/animation elsewhere in the Marketplace where it improves visual appeal (no further specifics given — use judgment).
3. Make Marketplace the site's home page (root URL) — repeated from earlier notes.

4. **Bug:** the Search Bar is Working But it Show the Result at end. I want instead of Show them at end . Instead After writing and Search Come a New Page where All the related Product appear. Also Add Back option Too.

---

## Cart


## Product Page

1. **"Add to Cart" animation:** on click, animate a small copy of the product image flying from the Add-to-Cart button toward the Cart icon, then disappearing once it arrives. 

---

## Checkout

---

## My Orders

---

## Buyer — Purchase History (New Feature)
1) remove Buy Agian Button 
## My Account

---

# Sellers

## Dashboard

## Orders


## COD Request (new section)
1. Remove the Added from Seller to increase or Decrease only appear them .
2. 

## Particular Order
1.  unread-message badges on both Seller and Buyer sides (see the dedicated Notification Badges section below for full spec).

## Edit Product


2. **Bug — data loss on edit:** opening Edit Product currently wipes existing Color, Stock, and Category data instead of preserving it. Fix this data-loss bug (closely related to item 1).
3. **New: proper Color / Size / Stock variant management — full workflow.**

   Build a real variant matrix in Basic Info, where each Color/Size combination has its own independently editable Stock and Price — not one shared Stock/Price for the whole product. Step-by-step flow:

   1. Add Additonal Things , where we First Wirte the Filed Name , and SOME THings as (Conditon : New )
   For aothere Product (Dim : 200X100)

---


---

## Banner — Bundle Deal Workflow (Important)

Define a complete, working mechanism for banner-driven bundle deals , :

1. 
2. When a buyer clicks that banner/deal, or Open tht Page from Marketplace or Procut then Also Show Banner  it auto-applies to their Cart: **Quantity is locked to the deal's fixed amount** (e.g. 2 units, not editable by the buyer for that deal), and **Price is automatically recalculated** as `unit price × deal quantity × (1 − discount%)`.
   - Example: unit price = Rs 100, deal = "Qty 2, 20% off" → total = 100 × 2 × 0.8 = **Rs 160**.
3. Both the Quantity and the resulting discounted Price should be locked/non-editable once a buyer takes that specific banner deal — they're accepting the deal as configured, not customizing it further.
4. This full flow (Banner creation → Marketplace display → Cart application → locked price/quantity) needs to work end-to-end, not just at the banner-creation step.
5. **Start Time behavior** for Banners follows the same rule as Discount Start Time above: Auto-select hides the Start field and shows only End Time; a manually-selected past Start Time is treated the same as Auto-select.
6. Also write the proper Mechanism for Discount Price too .

### Suggestions to Strengthen the Bundle-Deal Mechanism

1. **Multiple deal tiers on one banner** — e.g. "Buy 2 → 20% off" and "Buy 3 → 30% off" as tiers the buyer picks between, rather than one fixed deal per banner.
2. **Stock guard on the deal itself** — if remaining stock is below the deal's required quantity (e.g. 1 unit left but the deal needs 2), the deal should show as unavailable rather than letting the buyer trigger a broken checkout.
3. **Live countdown on the deal** — since Start/End time scheduling already exists, surface it visibly (e.g. "Deal ends in 2h 14m") on the banner or product card to drive urgency.
4. **Decide: one deal per checkout, or stackable** — can a buyer wanting 4 units apply the "Qty 2" bundle twice, or is it capped at one application per cart? This changes the price-calc logic, so decide before building.
5. **Show the deal on the Product Detail Page too, not just the banner** — a buyer who reaches the product via search or category browsing should still see the active deal and be able to trigger it directly from the product page.
6. **Combine with variants (see Edit Product, above):** decide whether the bundle deal means "any 2 units of this product regardless of color/size" or "2 units of the exact same variant." This affects both the buyer-facing UI (pick one variant twice, or two different variants?) and the backend price/stock calculation — worth locking down now since this and the variant system will otherwise collide.
7. **Define the expiry edge case** — if a buyer has a bundle-deal item sitting in their cart and the deal's End Time passes before checkout, does it silently revert to normal price, or block checkout with a "deal expired" message? Same category of edge case as the COD stock race condition already flagged elsewhere in this spec.

---



---





---


