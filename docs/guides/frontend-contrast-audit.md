# Frontend Contrast Audit Evolution

## 1. Why the previous audits missed these bugs

The admin light-mode contrast issues were **not** caused by a single wrong hex value like `#fff` in the global theme. The root causes were more subtle, and the existing audit stack was not designed to catch them:

| Gap in previous audit | What happened | Why it was missed |
|-----------------------|---------------|-------------------|
| **Static code guard only checks syntax, not perception** | `guardCssEngineering.js` looks for hardcoded `rgb(0 0 0 / …)` and `color: var(--muted)`. It flagged `var(--muted)` (a background token used as text) but did **not** flag `var(--muted-foreground)`, because that token is *semantically* correct for secondary text. | Static grep cannot know that `#666666` on a near-white admin card is barely readable in a dense information UI. |
| **Screenshot audit had no quantitative analysis** | `scripts/screenshot-audit.ts` captured full-page images of every admin route, but the output was just a folder of PNGs. | Human eyeballing dozens of screenshots is slow and inconsistent; subtle grey-on-grey text is easy to overlook. |
| **No theme-switch validation in screenshots** | The existing script did not force `data-theme="dark"` or `data-theme="light"` before capturing. | Contrast failures often appear in only one theme (e.g. dark-mode visited links or light-mode translucent backgrounds). |
| **No admin-specific semantic-color rules** | Marketing pages can legitimately use `muted-foreground` for large decorative copy, but admin dashboards need higher contrast for labels, metrics, and status text. | The audit treated all usages of `muted-foreground` equally. |
| **Transparent gradient text was invisible to guards** | `.admin-page-header h1` used `-webkit-text-fill-color: transparent` with a gradient. | No grep pattern was watching for this anti-pattern, and it looks fine in isolation but becomes ghost-like on light backgrounds. |

## 2. New three-layer audit scheme

We now run a **defense-in-depth** contrast pipeline for the admin area:

### Layer 1 — Static guard (`guardAdminContrast.js`)
Catches dangerous patterns before they reach the browser.

```bash
npm run guard:admin
```

Rules enforced:
- **Prohibits** `color: var(--muted-foreground)` inside `src/views/admin/`, `src/components/admin/`, and `src/styles/admin-base.css`.  
  *Rationale:* In the admin UI almost every piece of text is functional; `#666666` on white cards is too low-contrast.
- **Prohibits** `-webkit-text-fill-color: transparent` anywhere in admin scoped styles.  
  *Rationale:* Gradient-transparent text destroys readability on light backgrounds.
- **Prohibits** hardcoded low-contrast greys (`#cccccc`, `#999999`, `#aaaaaa`) in admin CSS.

### Layer 2 — Quantitative contrast audit (`contrastAudit.mjs`)
Uses Playwright + injected JavaScript to compute the **actual WCAG contrast ratio** of every visible text element against its effective background.

```bash
npm run audit:contrast
```

How it works:
1. Spins up a headless Chromium, mocks all `/api/*` calls so pages render without a backend.
2. Logs in by injecting a fake token into `sessionStorage`.
3. Visits every admin route (`/admin/dashboard`, `/admin/content`, `/admin/uploads`, `/admin/taxonomy`, `/admin/library`, `/admin/system`, `/admin/account`).
4. For each page, switches `data-theme` to **light** and then **dark**.
5. Injects a script that:
   - Walks the DOM and finds every element that contains direct text.
   - Computes the element’s effective background by walking up the tree and compositing translucent layers with Canvas 2D `getImageData`. This handles modern color formats (`oklab()`, `color-mix()`, `rgba()`) that simple regex parsers fail on.
   - Calculates the WCAG 2.1 luminance contrast ratio.
   - Reports any text that falls below:
     - **4.5:1** for normal text (WCAG AA)
     - **3.0:1** for large/bold text (WCAG AA Large)
6. Fails with exit code 1 if any element is below threshold, printing the offending selector, text snippet, and actual ratio.

### Layer 3 — Human review checklist (PR template)
For patterns that automation still cannot judge (e.g. hover states, focus rings, images with text overlays), a short manual checklist is required on any PR touching admin styles:

- [ ] I have run `npm run guard:admin` and it passes.
- [ ] I have run `npm run audit:contrast` and it passes.
- [ ] Any new status chips, metric cards, or table metadata use `var(--foreground)` rather than `var(--muted-foreground)`.
- [ ] No new `-webkit-text-fill-color: transparent` rules were added to admin headers or labels.

## 3. What we fixed as a result of the new audit

| Page / Component | Issue | Fix |
|------------------|-------|-----|
| **Admin base styles** (`admin-base.css`) | `.admin-page-header h1` used gradient-transparent text | Replaced with solid `color: var(--foreground)` |
| **Admin shared styles** | `.meta-line`, `.empty`, `.subaccordion > summary`, `.hint` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **AdminLayoutView** | `.admin-nav-group-title`, `.admin-nav-group-summary`, `.admin-mobile-nav-summary`, `.admin-nav-sheet-copy p`, `.admin-mobile-nav-link-copy` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **AdminLibraryView** | `.library-workspace-summary`, `.library-focus-panel span`, `.library-metric-card span`, list headers, empty states used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **SystemStatusPanel** | `.status-grid span` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **SystemWizardSteps** | `.step-hint`, `.mode-card span`, `.sync-hint`, `.pending-text`, `.validate-text` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **SystemEmbedUpdaterPanel** | `.panel-hint`, `.field-label`, `.status-item span`, `.pending-text`, `.save-hint` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **TaxonomyTreePanel** | `.group-meta`, `.category-meta`, `.empty`, `.empty-inline` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **CategoryEditorPanel** | `.hint` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **UploadsListPanel / UploadsEditPanel** | `.item-meta`, `.meta` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **AdminAccountView** | `.current-user` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **AdminTaxonomyView** | `.taxonomy-mobile-summary span` used `var(--muted-foreground)` | Elevated to `var(--foreground)` |
| **AdminDashboardView** | Quick-action `RouterLink` inherited browser default visited-link colour (`#555555`) in dark mode | Added explicit `text-card-foreground` class |
| **SystemEmbedUpdaterPanel** | `.status-chip` default state used `var(--info)` on `var(--info-bg)`, giving only ~3–4:1 | Changed chip text to `var(--foreground)` while keeping semantic background colours |

## 4. Running the full audit locally

```bash
# 1. Start the dev server
npm run dev

# 2. In another terminal, run the new guards
npm run guard:admin
npm run audit:contrast

# 3. Run the existing suite as well
npm run lint
npm run guard:css
npm run test
```

All four checks must pass before a PR touching admin UI can be considered ready.
