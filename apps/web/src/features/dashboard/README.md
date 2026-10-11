# Reference feature: dashboard

Every new feature copies this folder's structure, naming and patterns.
Design tokens and components are listed in `docs/design-system.md`.

## Folder structure

```
src/features/<feature>/
├── <Feature>Page.tsx          route component (one per page), named export
├── api/
│   └── use<Thing>.ts          React Query hooks + query keys + fetch functions
├── components/
│   └── <Component>.tsx        feature-only components (PascalCase, memo when props are stable)
└── README.md                  only for the reference feature
```

Here: `DashboardPage.tsx`, `api/useDashboardStats.ts`,
`components/WelcomeBanner.tsx`, `components/StatCard.tsx`,
`components/QuickActionCard.tsx`.

## Naming

- Files and components: PascalCase (`StatCard.tsx` exports `StatCard`).
- Hooks: `useXxx`, one main hook per file under `api/`.
- Query keys: an object `xxxKeys` in the same file; always include `tenantId`
  so one school's cache never shows another school's data.
- Routes: kebab-case paths, declared once in `src/navigation/menu.ts`
  (menu item + role access) and wired in `src/router.tsx`.

## Using the shared UI components

Import from `@/components/ui` only. Do not add colors or one-off styles in a
page; use the theme tokens (`bg-brand-700`, `text-ink-muted`, `rounded-card`,
`shadow-soft`, ...). If a new look is needed, add it to `src/components/ui`
or to the tokens in `src/index.css`.

```tsx
import { Card, CardHeader, PageHeader, Table, type TableColumn } from "@/components/ui";

const columns: TableColumn<Student>[] = [
  { key: "name", header: t("students:columns.name"), render: (s) => s.fullName },
];

<PageHeader title={t("students:title")} />
<Card>
  <CardHeader title={t("students:listTitle")} />
  <Table
    columns={columns}
    rows={query.data?.rows ?? []}
    rowKey={(s) => s.id}
    loading={query.isPending}
    empty={<EmptyState title={t("students:empty")} />}
    pagination={{ page, pageSize: 25, total: query.data?.total ?? 0, onPageChange: setPage }}
  />
</Card>
```

Lists that can grow past ~50 rows must be paginated by the API
(`?page=&pageSize=`) and shown with the `pagination` prop.

## Data fetching (React Query)

- Fetch with the shared axios client `api` from `@/lib/api`. It adds the
  in-memory access token and refreshes once on 401. Never store tokens.
- Wrap each request in a hook under `api/` (see `useDashboardStats`).
- Show `isPending` with `Spinner`, `isError` with
  `<Alert tone="danger">{t(\`errors:${toErrorKey(error)}\`)}</Alert>`.
  The API returns error codes; `toErrorKey` (`@/lib/apiError`) maps them to
  locale keys. Never show a raw code.
- `useDashboardStats` currently returns placeholder data; replacing the fetch
  function body is the only change needed when the endpoint exists.

## Text and locale keys

- No visible text in JSX: every label is `t("namespace:key")`.
- This feature's keys live in `src/locales/am/dashboard.json` (Amharic,
  copied from legacy) and `src/locales/en/dashboard.json`. Menu labels live
  in `nav.json`, shared words (roles, loading, pagination) in `common.json`,
  error messages in `errors.json`.
- A new feature adds `src/locales/{am,en}/<feature>.json` and registers it in
  `src/i18n/resources.ts`. `npm run lint` fails if the am and en keys differ.

## Environment

`VITE_API_URL` sets the API base URL (default `http://localhost:4000`).
