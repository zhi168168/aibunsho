# False-positive support page — 2026-11-09

Target: `aiチェッカー 自分で書いたのに`; route: `/gohantei/`.

The visitor needs help responding to an authorship allegation. Lead with preserving the original and result, gathering existing writing records, and asking the reviewer for specific reasons and a review process. Explain limitations without claiming a score proves authorship. Include a materials checklist, an editable/copyable Japanese explanation template, guidance when drafts are missing, and FAQs. The optional real checker follows the article; it is not presented as a certificate or a way to overturn a decision.

The homepage, guide and AI文章判定 page expose crawlable links to the new page. Its two contextual recommendations cover score interpretation and free-tool conditions. Prerendering adds the route to the sitemap and supplies title, description, canonical, body and FAQ structured data in initial HTML.

Keyword character coverage is 3.27% (102 / 3115 normalized main-content characters, six natural phrase occurrences). This is character coverage, not a Japanese word-frequency estimate. Measurement includes tool, TOC and FAQ, excluding navigation, footer, metadata, schema and closed account dialogs; NFKC, case and whitespace are normalized.

Validation: 53 working-tree tests passed; TypeScript, production build, prerender, SEO and all four landing density checks passed. Browser checks covered editing/copying the template (clipboard verified), checklist interaction, reload reset, checker navigation and the contextual incoming link. No analysis request was needed to test the support workflow.

Visual QA: retained existing homepage typography, black/lavender palette, buttons and editorial layout. Desktop and 390px/320px mobile layouts were inspected. Segmented H1 prevents splitting AIチェッカー; no horizontal page overflow. Template remains editable on narrow screens. Screenshots: `gohantei-desktop.jpg`, `gohantei-mobile.jpg`, `gohantei-template-mobile.jpg` in the task visualization directory. The support-first content order is intentional.

No detection-accuracy or indexing/ranking claims are made. Template edits and checklist state reset on reload; copying never sends a message to a reviewer.

Release isolation: the staged snapshot independently passed 51 tests, TypeScript, production build, prerender, SEO and density checks. Unrelated advanced-report edits were excluded.
