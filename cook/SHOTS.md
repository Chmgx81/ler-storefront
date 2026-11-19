# Shots

One row per still. Same framing every round so rounds compare to each other.

| ID | Route | Viewport | What it tests | Reference |
|---|---|---|---|---|
| S01 | / | 1440x900 | First fold: nav weight, headline scale, hero split, product tag | Fellow fold, Parachute fold |
| S02 | / full page | 1440x full | Section rhythm, product grid, editorial split, collections, quote, footer | Parachute full, Ferm full |
| S03 | /shop | 1440x900 | Filter bar, grid density, card typography | Parachute category |
| S04 | /product/round-bellied-teapot | 1440x900 | Buy panel hierarchy, gallery crop, option states | Ferm product page |
| S05 | / with bag open | 1440x900 | Drawer proportions, line items, shipping meter | own |
| S06 | /checkout with 2 lines | 1440x900 | Form density, summary card, two-column balance | own |
| S07 | / | 390x844 | Mobile hero order, type scale, quick add | Fellow mobile, Ferm mobile |
| S08 | /product/wide-pasta-bowl | 390x844 | Mobile buy flow, stacked gallery, sticky-free info | own |
| S09 | /order/confirmed | 1440x900 | Confirmation tone, hierarchy | own |
| S10 | /story | 1440x900 | Editorial consistency, process grid | Ferm story, Italic |
| S11 | / with search open | 1440x900 | Overlay, result density, input emphasis | own |
| S12 | / with menu open | 390x844 | Mobile menu, account and bag rows | own |
| S13 | /checkout | 390x844 | Mobile summary-first order, form rhythm | own |
| S14 | /account (signed out) | 1440x900 | Auth framing, tab states, field styling | own |
| S15 | /account (signed out) | 390x844 | Mobile auth: form first, then the why | own |
| A01–A06 | /account, /checkout, /order/confirmed | both | Signed-in dashboard, empty state, order card, confirmation | own |

Notes:
- Hero must be complete inside the first 900px, with the product tag visible.
- Product cards: 3:4 image, name 14, price 13.5, quick add on hover.
- Body copy never touches the viewport edge; min 20px inline padding.
- Auth stills must show real DB-backed state: signed-out panel, empty dashboard, dashboard with a placed order, and the mobile dashboard.
