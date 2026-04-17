# Design System: High-End Editorial

## 1. Overview & Creative North Star
**The Creative North Star: "The Silent Curator"**

This design system moves beyond the rigid, utilitarian nature of standard Material 3 implementations to embrace the soul of high-end editorial print. The objective is to create a digital environment that feels "hushed"—where the UI recedes into the background, allowing the content to breathe. 

We achieve a premium feel not through decoration, but through **Intentional Asymmetry** and **Tonal Depth**. By breaking the "boxed-in" grid and using oversized typography paired with generous whitespace, we signal to the reader that this content is curated, authoritative, and worthy of their time.

---

## 2. Colors & Surface Philosophy
The color palette is rooted in sophisticated, desaturated tones that prioritize ocular comfort and long-form reading.

### The "No-Line" Rule
**Borders are a failure of hierarchy.** Within this system, 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts or tonal transitions. 
- Use `surface_container_low` for the main background.
- Use `surface_container_lowest` (Pure White) for "elevated" content areas like article cards.
- Use `surface_container_high` for utility sidebars or navigation drawers.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine vellum paper. 
- **Base Layer:** `surface` (#faf9fc).
- **Secondary Content:** `surface_container` (#eceef3).
- **Hero/Interactive Zones:** `surface_bright` or `surface_container_lowest`.

### The "Glass & Gradient" Rule
To avoid a flat "template" look, interactive floating elements (like sticky headers or mobile menus) must use **Glassmorphism**:
- **Background:** `surface` at 80% opacity.
- **Effect:** `backdrop-filter: blur(12px)`.
- **Signature Polish:** For primary Call-to-Actions, use a subtle linear gradient from `primary` (#5d5e61) to `primary_dim` (#515255) to give the button a tactile, "pressed-ink" quality.

---

### 3. Typography
We use a high-contrast pairing: **Plus Jakarta Sans** for structural UI and **Newsreader** for the narrative soul.

| Token | Font Family | Size | Weight / Usage |
| :--- | :--- | :--- | :--- |
| `display-lg` | Plus Jakarta Sans | 3.5rem | Bold, asymmetrical hero headers. |
| `headline-md`| Plus Jakarta Sans | 1.75rem | Section titles, uppercase for impact. |
| `title-lg`   | Newsreader | 1.375rem | Article sub-headlines, italicized for flair. |
| `body-lg`    | Newsreader | 1.0rem | The standard for article reading. |
| `label-md`   | Plus Jakarta Sans | 0.75rem | All-caps, tracked out (+5%) for metadata. |

**The Typography North Star:** Lead with Newsreader. It is a transitional serif that feels academic yet modern. Ensure a line height of 1.6x for all `body` tokens to maximize readability.

---

## 4. Elevation & Depth
In this system, depth is "felt," not "seen." We replace the shadows of 2014 with **Tonal Layering**.

*   **The Layering Principle:** To lift a card, do not add a shadow. Instead, place a `surface_container_lowest` card on a `surface_container_low` background. The subtle shift in hex value creates a natural, sophisticated lift.
*   **Ambient Shadows:** If an element must float (e.g., a Modal), use a "tinted shadow."
    *   `box-shadow: 0 12px 40px rgba(46, 51, 57, 0.06);` (Using `on_surface` color at 6%).
*   **The "Ghost Border" Fallback:** If accessibility requires a boundary, use a "Ghost Border": `outline_variant` (#aeb2ba) at **15% opacity**. Never 100%.

---

## 5. Components

### Buttons
- **Primary:** `primary` background with `on_primary` text. Use `lg` roundedness (0.5rem). No shadow.
- **Secondary:** `surface_container_high` background. Feels like part of the page.
- **Tertiary:** Text-only using `primary` color. Use for low-emphasis actions like "Read More."

### Article Cards & Lists
- **Forbid Dividers:** Horizontal lines interrupt the eye. Separate list items using `1.5rem` to `2rem` of vertical whitespace.
- **Layout:** Use asymmetrical image ratios (e.g., 4:5 instead of 16:9) to break the standard blog "grid" feel.

### Input Fields
- **Style:** "Soft Box" style. Background: `surface_container`. 
- **Focus State:** Transition to `primary` ghost-border (20% opacity) and a subtle 2px inset highlight. No heavy outlines.

### Editorial Signature Components
- **Drop Cap:** Use `primary` color for the first letter of an article, set in `display-sm`.
- **The "Reading Progress" Glass Rail:** A 2px thin line at the top of the viewport using `primary` color, sitting inside a glassmorphic header.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `Newsreader` for all long-form text. It reduces eye strain and feels premium.
*   **Do** use "Optical Centering." Sometimes an element needs to be slightly off-center to look right in an editorial layout.
*   **Do** prioritize the `surface_container_lowest` to `surface_container_highest` tokens to guide the user's eye from the background to the most important interaction.

### Don't
*   **Don't** use 100% black (#000). Use `on_surface` (#2e3339) for all "black" text to maintain a softer, ink-on-paper feel.
*   **Don't** crowd the margins. If you think there is enough whitespace, add 16px more.
*   **Don't** use standard Material 3 icons at 100% opacity. Soften them to 70% opacity using `on_surface_variant` to ensure they don't compete with the typography.