# Favicon implementation — 2026-11-05

Official source: https://developers.google.com/search/docs/appearance/favicon-in-search

Google's documentation retrieved on 2026-11-05 specifies a square icon of at least
8×8 pixels and recommends larger than 48×48. Supported formats listed include
PNG and ICO. The homepage must declare the icon in a head link; Googlebot must
be able to crawl the homepage and Googlebot-Image the icon. Keep the URL stable.
Only one favicon is supported per hostname. Compliance does not guarantee display
and is separate from whether a page is indexed. Recrawling can take days to weeks.

Implementation:

- User-provided source: `icon.png`, 3840×2161. Crop the red mark and center it on
  a square cream background, preserving its aspect ratio and leaving 12% margins.
- Primary PNG: `/favicon-192x192.png`; additional PNG: `/favicon-96x96.png`.
- Browser fallback: `/favicon.ico`, containing 16, 32 and 48 pixel frames.
- Apple touch icon: `/apple-touch-icon.png`, 180×180.
- Larger reusable asset: `/icon-512.png`, 512×512.
- The shared HTML template declares the icons for the homepage and guide pages.
- Header/footer branding uses the same image. Retired the previous SVG favicon.
- Existing robots rules allow all public assets and only disallow `/api/`.

Regenerate with Pillow: `python scripts/generate-icons.py`.
Production crawling and Google search display must be verified after deployment;
local build validation alone does not confirm either outcome.
