# CODEBASE_CONTEXT.md — HomeServices

> Agent reads this before Stage 2 (Plan). Keep updated when patterns change.

## App role
Customer mobile app (React Native).

## Mission
**Parity with `homeServices-customer-web`.** Full standing instructions:

`docs/CUSTOMER_WEB_RN_PARITY_PROMPT.md`

## Tech stack
- **Framework:** React Native 0.73 + React 18 + TypeScript
- **State:** Zustand (`src/store/`) + AsyncStorage persistence where used
- **Navigation:** React Navigation (native-stack + bottom-tabs)
- **Backend access:** Axios services under `src/services/api/` + Firebase (Auth/Firestore/Messaging/Storage as used)
- **Styling:** StyleSheet + theme from `src/utils/theme.ts` + `src/fromWebCss/`
- **i18n:** i18next + react-i18next (`src/i18n/`, nested locales + `locales/web/` flat merge via `mergeWebI18n.ts`)
- **Shared UI:** `sapvt-ltd-app-packages`
- **Testing:** Jest (+ React Native Testing Library when present)

## Folder conventions
```
src/
  components/     ← shared UI (modals, badges, inputs)
  screens/        ← feature screens (map 1:1 to customer-web pages)
  navigation/     ← navigators
  services/api/   ← API clients
  store/          ← Zustand stores
  hooks/
  i18n/locales/   ← nested + web/ flat keys
  fromWebCss/     ← StyleSheet ports of web CSS
  utils/          ← theme.ts, mergeWebI18n.ts, helpers
  types/
  config/
  assets/
```

## Patterns
- Prefer reusing `src/components/*` and app packages before building new UI.
- User-visible strings go through `t('...')` — no hardcoded English/Hindi; never show raw keys.
- Colors/spacing from `theme` / web CSS ports — no random hex in new screens.
- API calls live in `src/services/api/`, not inline in screens.
- Keep files under ~250 lines; split screens/components if larger.
- Crystal glass: approximate web `color-mix` (see Partner `CrystalSurface` pattern).
- Do not remount tab navigators when theme/night vision changes.

## Do not assume (web FE agent defaults)
- No Antd, no Redux Toolkit, no CSS Modules, no `menuConfig.ts` web routes.
- Navigation = React Navigation screen registration, not web router paths.
- Web CSS does not run in RN — port to StyleSheet / fromWebCss.
