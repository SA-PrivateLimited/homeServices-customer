# CODEBASE_CONTEXT.md — HomeServices

> Agent reads this before Stage 2 (Plan). Keep updated when patterns change.

## App role
Customer mobile app (React Native).

## Tech stack
- **Framework:** React Native 0.73 + React 18 + TypeScript
- **State:** Zustand (`src/store/`) + AsyncStorage persistence where used
- **Navigation:** React Navigation (native-stack + bottom-tabs)
- **Backend access:** Axios services under `src/services/api/` + Firebase (Auth/Firestore/Messaging/Storage as used)
- **Styling:** StyleSheet + theme from `src/utils/theme.ts` (light/dark)
- **i18n:** i18next + react-i18next (`src/i18n/`, locales en/hi)
- **Testing:** Jest (+ React Native Testing Library when present)

## Folder conventions
```
src/
  components/     ← shared UI (modals, badges, inputs)
  screens/        ← feature screens
  navigation/     ← navigators
  services/api/   ← API clients
  store/          ← Zustand stores
  hooks/
  i18n/locales/
  utils/          ← theme.ts, helpers
  types/
  config/
  assets/
```

## Patterns
- Prefer reusing `src/components/*` before building new UI.
- User-visible strings go through `t('...')` — no hardcoded English/Hindi in JSX.
- Colors/spacing from `theme` / `baseline.md` — no random hex in new screens.
- API calls live in `src/services/api/`, not inline in screens.
- Keep files under ~250 lines; split screens/components if larger.

## Do not assume (web FE agent defaults)
- No Antd, no Redux Toolkit, no CSS Modules, no `menuConfig.ts` web routes.
- Navigation = React Navigation screen registration, not web router paths.
