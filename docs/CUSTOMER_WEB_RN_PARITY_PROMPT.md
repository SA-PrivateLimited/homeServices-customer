# AGENT PROMPT — Customer Web → HomeServices RN Parity

**Canonical path:** `HomeServices/docs/CUSTOMER_WEB_RN_PARITY_PROMPT.md`

**Copy-paste this block (or say: “Continue customer web parity”) whenever you open a new chat.**

---

You are implementing **full UX/UI/behavior parity** between:

| Role | Path | Stack |
|------|------|--------|
| **Source of truth** | `homeServices-customer-web` | Vite + React + CSS (`color-mix`, crystal glass) |
| **Target** | `HomeServices` | React Native 0.73 + TypeScript + StyleSheet |
| **Contracts** | `homeservices-backend` | API / business rules |
| **Shared RN UI** | `packages/saPvtLtdAppPackages` (`sapvt-ltd-app-packages`) | EmptyState, Chip, Icon, etc. |
| **Shared web UI** | `packages/saPvtLtdWebPackages` | Reference only for Customer RN |

Workspace root: `home-services` (multi-repo).  
Customer Android id: **`com.akansho.customer`** — never change.

---

## 1. Standing goal

Make every Customer **screen, sheet, card, chip, empty state, theme, night vision, logout, notifications, and copy** in `HomeServices` match `homeServices-customer-web`.

When the user points at a screenshot or says “match web”:

1. Open the **web** page/CSS/component first.
2. Diff against the RN screen.
3. Apply the **smallest safe change** that restores parity.
4. Verify i18n (no raw keys), loading/empty/error, and mobile layout.

Do **not** wait for a full re-prompt of product rules — this document is the prompt.

---

## 2. Decision hierarchy (Akansho)

1. User’s actual goal  
2. User simplicity and clarity  
3. Business correctness  
4. Privacy and security  
5. Existing product consistency (**web parity**)  
6. Existing architecture  
7. Technical quality  
8. Visual polish  

Prefer the smallest safe change that gives the simplest correct experience.

---

## 3. Product truths (never break)

### Auth
- Normal login: **Mobile → PIN** (no OTP).
- OTP only: first-time / signup / forgot PIN.
- Do not casually rewrite Firebase verifier lifecycle, session/storage keys, or JWT hydration.

### Multi-role
- One Akansho user can be Customer, Partner, or both — never force a second phone.
- Customer → Partner: upgrade / enable-partner-profile flows, not “use the other app” dead-ends.
- Cross-app switch uses **context handoff codes**; preserve handoff screens and APIs.

### Privacy & jobs
- Never show Call when real Partner phone is intentionally hidden and there is no virtual calling infra.
- Self-exclusion: user’s own Partner profile must not appear when searching as Customer (`partner.userId !== user.id`).
- Partner collaboration stays on one Customer Job (no fake duplicate jobs).

### Settings IA
Settings owns: Profile, Account & Security, Help & Support, App & Other.  
Help is entry; Feedback lives inside Help.

### Guest UX
Guest surfaces (e.g. Browse Help) must not depend on auth-only routes like `/settings`.

---

## 4. Screen / page map (web → RN)

| Web (`homeServices-customer-web`) | RN (`HomeServices`) |
|-----------------------------------|---------------------|
| `pages/PublicHomePage.tsx` (+ CSS) | `screens/PublicHomeScreen.tsx` |
| `pages/BrowsePage.tsx` | Browse / providers list flows (`ProvidersListScreen`, browse sections) |
| `pages/ProviderDetailsPage.tsx` | `screens/ProviderDetailsScreen.tsx` |
| `pages/RequestPage.tsx` | `screens/ServiceRequestScreen.tsx` |
| `pages/ActivePage.tsx` | `screens/ActiveServiceScreen.tsx` |
| `pages/HistoryPage.tsx` | `screens/ServiceHistoryScreen.tsx` |
| `pages/LoginPage.tsx` | `screens/LoginScreen.tsx` (+ phone/PIN/OTP screens) |
| `pages/AuthHandoffPage.tsx` | `screens/AuthHandoffScreen.tsx` |
| `pages/SettingsPage.tsx` (+ settings children if any) | `screens/SettingsScreen.tsx` |
| `pages/ProfilePage.tsx` | `screens/ProfileScreen.tsx` |
| Help / feedback panels | `screens/HelpSupportScreen.tsx` + shared Help patterns |
| Legal / Privacy / Terms | `screens/LegalDocumentScreen.tsx` |
| Notifications panel / empty | `screens/NotificationsScreen.tsx` |
| Account menu (header) | Account menu / `AppHeader` equivalents under `src/components/` |
| `ShareProviderContact` / recommend contact | `screens/ShareContactRecommendationScreen.tsx` |
| Provider cards / galleries | Matching components under `src/components/` |

If a web page has no RN screen, **say so** and propose the minimal screen + navigation registration — do not invent dead UI.

---

## 5. How to port CSS → RN (mandatory method)

### Source files
- Page CSS: `homeServices-customer-web/src/pages/*.css`
- Global / glass: `src/styles/global.css`, `src/styles/crystal-glass.css`
- Layout shell: `src/layouts/AppShell.css`
- Components: `src/components/**/*.css`

### RN destinations
- StyleSheets: `HomeServices/src/fromWebCss/*.styles.ts` (and page-specific files)
- Mirrored CSS reference copies may live under `src/fromWebCss/pages|styles|components/` — keep in sync when porting
- Reusable glass card: prefer a shared `CrystalSurface` (port from Partner RN `homeServices-provider/src/components/CrystalSurface.tsx` if Customer lacks it)

### Approximation rules (RN has no `color-mix` / `backdrop-filter`)
- Web `color-mix(in srgb, var(--primary) N%, …)` → hex + alpha suffix (`${primary}2E` ≈ 18%, `47` ≈ 28%, etc.)
- Crystal / glass cards: **card base + status/primary wash + top highlight/sheen + soft colored shadow**
- Status-tinted job/request cards: use **status token**, not always primary  
  - e.g. accepted/success → mint (`theme.success`)  
  - in-progress/active → `theme.primary`  
  - cancelled/error → `theme.error`  
  - pending → `theme.warning`
- Left stripe on cards: match web inset stripe (`borderLeftWidth: 4` + status color)
- Border radius: match web (~14–20)
- Shadows: soft, status-tinted when web uses status shadow; avoid thick Android elevation that looks like a hard border
- Chips / filters: selected = primary fill + white text (unless web uses another variant); inactive = card + border

### Theme / night vision
- Align night-vision surfaces with web (`#0B1220`, `#151E2E`, etc.) — see Partner RN `NIGHT_VISION_SURFACES` / customer-web theme tokens
- Brand accents stay branded; surfaces follow night vision
- **Never** put `key={…theme…}` on `Tab.Navigator` / root stacks (causes remount + refetch). Theme via style props / context only
- Runtime branding from admin palette must keep **success** usable as mint for status cards when web does

---

## 6. i18n rules

- Every user-visible string through `t('…')` / `tx('…')`
- Customer RN merges nested locale JSON + flat web keys via `src/utils/mergeWebI18n.ts` and `src/i18n/locales/web/{en,hi}.json`
- When adding UI copy: add keys to **nested** locale files **and** sync flat web keys when the string exists on web
- **Never show raw keys** on screen. `t('missing.key')` returns the key (truthy) — do **not** rely on `t(key) || 'fallback'`. Use:
  - real key in locale files, and/or
  - `t(key, { defaultValue: '…' })`
- Empty states, logout, notifications, settings labels — verify both `en` and `hi`

### Notifications empty (known pattern)
- Title: `notifications.noNotifications` (or web equivalent)
- Hint: `notifications.noNotificationsHint` / `notifications.empty` — must exist in locales

---

## 7. Component & architecture rules

- Preserve existing navigation (`src/navigation/`); register new screens properly
- API only in `src/services/api/` — no fake frontend-only business state
- Reuse `sapvt-ltd-app-packages` (Chip, Chips, EmptyState, Icon, Button, ConfirmDialog wrappers)
- If the same bug exists in Customer **and** Partner web, check `packages/saPvtLtdWebPackages` / app packages first
- Keep presentational components free of business rules where possible
- Handle loading / empty / error / success / disabled
- Mobile-first: safe area, keyboard, touch targets, no horizontal overflow

---

## 8. Parity checklist (every screen change)

Before marking done, mentally compare web vs RN:

- [ ] Same information hierarchy (title, sub, primary CTA)
- [ ] Same card/glass treatment and status colors
- [ ] Same chips/filters selected + counts behavior
- [ ] Same empty / error copy (translated)
- [ ] Same logout / destructive placement (Settings: after Other, divider, full-width danger outline if web has it)
- [ ] Night vision surfaces correct; accents branded
- [ ] Theme toggle does not remount tabs or wipe lists
- [ ] Auth / handoff / phone privacy unchanged unless task requires it
- [ ] No raw i18n keys
- [ ] Backend contracts still honored

---

## 9. Reference: Partner RN parity already done

Use `homeServices-provider` as a **pattern library** (not a place to copy Partner product rules):

- `src/components/CrystalSurface.tsx` — glass approximation
- `src/utils/theme.ts` — night vision + `paintProviderWebChrome`
- `src/fromWebCss/*` — CSS → StyleSheet ports
- Jobs/History status washes, Settings logout wrap, notification i18n fixes

Port patterns into Customer naming (`paintCustomerWebChrome`, `CUSTOMER_WEB` tokens, etc.) when adding the same capabilities.

---

## 10. Working loop (default)

When user says match a screen / sends a screenshot:

1. Identify web file(s) + RN file(s).
2. Quote the web CSS/UX truth briefly.
3. Implement RN changes only in the owning Customer files.
4. Fix any missing i18n keys touched by the screen.
5. Summarize what now matches web (short).

When user says “continue parity” without a screen:

1. Pick the next high-traffic gap (Browse → Provider details → Request → Active → History → Settings → Login).
2. Diff web vs RN.
3. Close the largest visual/UX gaps first.

---

## 11. Explicit do-nots

- Do not change `applicationId` / package name
- Do not force-push, commit secrets, or commit `.env`
- Do not rewrite Firebase phone auth / handoff / session keys “for cleanup”
- Do not patch Partner app for Customer bugs (wrong repo)
- Do not use desktop-only layouts on phone screens
- Do not expose API enums as user-facing labels
- Do not invent Call buttons that leak private phones

---

## 12. One-line kickoff (user can say only this)

> Continue Akansho Customer web→RN parity per `HomeServices/docs/CUSTOMER_WEB_RN_PARITY_PROMPT.md`. Web is source of truth. Match the next gap (or this screenshot) surgically.

---

*Last aligned with Partner web→RN parity lessons (crystal glass, night vision, status cards, Settings logout, i18n key hygiene, no navigator remount on theme).*
