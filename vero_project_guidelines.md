# Vero Theme Development: Standard Operating Procedures & Project Guidelines

This document serves as a comprehensive prompt and memory guide for the IDE to understand the established workflow, theme standards, and the history of changes made to the Vero Shopify theme.

## 1. Core Development Workflow
*   **Figma is the Single Source of Truth:** NEVER write UI code, guess dimensions, or assume colors blindly. All design specs (typography, padding, colors, icons) MUST be pulled directly from the live Figma file using the `TalkToFigma` MCP Server (`get_selection` and `get_node_info`).
*   **Direct Execution:** Skip unnecessary planning phases. Once the Figma node data is parsed, directly implement the liquid/CSS/schema changes.
*   **Section Replacement:** When replacing native Shopify sections (e.g., Header, Footer), duplicate the existing native file (e.g., `footer.liquid` -> `verofooter.liquid`), rename the schema, apply the Figma modifications, and then update the corresponding JSON group (e.g., `footer-group.json`) to use the new section. Do not destroy the original native files.

## 2. Common Theme Settings & Section Standards
Every new or modified section MUST adhere to the following baseline schema and liquid standards:

### Spacing & Padding
Every section must include these exact four padding controls in its schema, properly applied via CSS media queries:
1.  `padding_top` (Desktop Top Padding)
2.  `padding_bottom` (Desktop Bottom Padding)
3.  `padding_top_mobile` (Mobile Top Padding)
4.  `padding_bottom_mobile` (Mobile Bottom Padding)

### Responsive Media
*   **Desktop & Mobile Separation:** Any section featuring a banner, slideshow, or large image must include separate `image_picker` settings for Desktop and Mobile (`image_mobile`). Use the `<picture>` tag with `media="(max-width: 749px)"` to render the correct image based on device size.
*   **Video Support:** Where applicable (like Carousels), provide a video picker that overrides images if populated.

### Clean Schemas & Content Toggles
*   **No Redundant Settings:** If a setting in the schema is not actively doing anything on the frontend, delete it. Keep the Customizer clean.
*   **Hide/Show Content:** Instead of forcing placeholder text, provide boolean toggles (e.g., "Show Text Content") to allow the user to completely hide text overlays, leaving only the background media. Default text fields to blank (`""`).

### Styling & Layout
*   **Color Schemes:** Always utilize Shopify's native color scheme selector (`color_scheme` schema setting) to control section background and foreground colors dynamically, rather than hardcoding hex codes.
*   **Page Width:** Provide layout options (e.g., Full Bleed vs. Grid/Page Width) where standard.

## 3. Log of Completed Features (Today's Tasks)

### Header & Navigation (`header.liquid`, `theme.liquid`)
*   **Typography:** Imported Google Fonts (`Poppins`, `Montserrat`, `Inter`). Mapped dropdowns, links, and text to `Poppins` 20px.
*   **Search Bar:** Replaced the default magnifying glass icon with a custom 354x50px Search Bar that triggers the native Shopify search behavior.
*   **Icons & Logo:** Reordered utility icons (Cart -> Account -> Wishlist), removed redundant search icons, and constrained the logo max-height to prevent header stretching.

### Main Carousel (`custom-carousel.liquid`)
*   **Creation:** Duplicated the native slideshow and built a custom "Main Carousel".
*   **Features Added:** Added separate mobile image pickers, video support per slide, and the 4 standard padding controls (Desktop/Mobile).
*   **Content Control:** Added a "Show Text Content" toggle to allow slides to be purely visual without text boxes.

### Vero Footer (`verofooter.liquid`, `footer-group.json`)
*   **Creation:** Cloned the native footer to build a highly customized `verofooter.liquid`.
*   **Figma Integration:** Applied exact Figma typography (`Inter` for headings/links, `Montserrat` for the copyright block) and layout styling.
*   **Payment Customization:** Replaced Shopify's dynamic payment icon loop with a `payment_image` image picker to allow for a custom Figma-exported payment banner.
*   **Activation:** Modified `footer-group.json` to natively render `verofooter` instead of the default footer.

---
**Instruction for the IDE:** When continuing work on this project, strictly enforce the "Figma First" rule, ensure all new sections contain the "Common Theme Settings", and refer back to these completed files as architectural templates.
