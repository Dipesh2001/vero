# Modern Badges Conditions

This document outlines all the badges available in the `modern-badges.liquid` snippet and the specific conditions required for each to be displayed.

## 1. Promo Badge
- **Class**: `modern-badge--promo`
- **Text**: Driven by the `badge_name` field of the promotional campaign.
- **Conditions**:
  - The snippet is NOT being rendered in a gallery (`is_gallery != true`).
  - The shop has an active `promotional_campaign` metaobject.
  - The current timestamp falls between the campaign's `start_time` and `end_time`.
  - The current product is included in the campaign's `products` list.
- **Note**: This badge has the highest priority among discount-related badges. If this badge is shown, the **Sale**, **New**, **Best Seller**, and **Featured** badges are hidden.

## 2. Sale Badge
- **Class**: `modern-badge--sale`
- **Text**: Translated string `products.product.on_sale` (defaults to "Sale").
- **Conditions**:
  - The snippet is NOT being rendered in a gallery (`is_gallery != true`).
  - There is NO active **Promo Badge** for this product.
  - The product's Compare-at Price is greater than its Price (`product.compare_at_price > product.price`).
- **Note**: If this badge is shown, the **New**, **Best Seller**, and **Featured** badges are hidden.

## 3. New Badge
- **Class**: `modern-badge--new`
- **Text**: Translated string `products.badges.new` (defaults to "New").
- **Conditions**:
  - Neither the **Promo Badge** nor the **Sale Badge** is active (`has_discount_badge == false`).
  - The product contains the tag `badge_new`.
- **Note**: This badge can appear alongside other tag-based badges (Best Seller, Featured) as long as no discount badge is active.

## 4. Best Seller Badge
- **Class**: `modern-badge--bestseller`
- **Text**: Translated string `products.badges.best_seller` (defaults to "Best Seller").
- **Conditions**:
  - Neither the **Promo Badge** nor the **Sale Badge** is active (`has_discount_badge == false`).
  - The product contains the tag `badge_best_seller`.
- **Note**: This badge can appear alongside other tag-based badges (New, Featured) as long as no discount badge is active.

## 5. Featured Badge
- **Class**: `modern-badge--featured`
- **Text**: Translated string `products.badges.featured` (defaults to "Featured").
- **Conditions**:
  - Neither the **Promo Badge** nor the **Sale Badge** is active (`has_discount_badge == false`).
  - The product contains the tag `badge_featured`.
- **Note**: This badge can appear alongside other tag-based badges (New, Best Seller) as long as no discount badge is active.

## 6. Sold Out Badge
- **Class**: `modern-badge--sold-out`
- **Text**: Translated string `products.badges.sold_out` (defaults to "Sold Out").
- **Conditions**:
  - The product or variant is NOT available (`display_available == false`). 
    - If a specific `variant` is provided to the snippet, it checks `variant.available`.
    - Otherwise, it falls back to checking the overall `product.available`.
- **Note**: This badge operates completely independently from the others. It has its own container and displays regardless of whether any other badges (Promo, Sale, Tags) are showing, appearing usually at the bottom-right of the image.

---

### UI/Layout Notes:
- **Card Context (`is_card`)**: When `is_card` is passed as true, the badges container uses absolute positioning to overlay securely on the product image (with position configurable via `settings.badge_position` like top left, top right, etc.).
- **Multiple Tag Badges**: The tag-based badges (New, Best Seller, Featured) can display simultaneously if the product has multiple tags AND is not on sale. They will wrap within the flexbox container.
