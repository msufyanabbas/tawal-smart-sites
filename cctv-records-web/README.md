# Tawal Smart Sites — Web

React (Vite + TypeScript) front-end for the Tawal Smart Sites CCTV records system. Mirrors
the React Native mobile app's flows against the same NestJS backend.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- React Router v6
- TanStack React Query (data fetching, caching, mutations)
- React Hook Form + Zod (forms + validation)
- Axios with JWT auth + refresh-token interceptor
- react-hot-toast for notifications

## Getting started

```bash
cd cctv-records-web
cp .env.example .env          # then edit VITE_API_BASE_URL
npm install
npm run dev                   # http://localhost:5173
```

### Production build

```bash
npm run build
npm run preview
```

## Environment variables

| Var | Required | Description |
|-----|----------|-------------|
| `VITE_API_BASE_URL` | yes | Base URL of the NestJS backend, no trailing slash (e.g. `http://localhost:3000`). |

> The backend must be configured with CORS for the web origin. The shared `main.ts`
> now reads `CORS_ORIGINS` (comma-separated). Set `CORS_ORIGINS=http://localhost:5173`
> in the backend `.env` for local dev.

## Authentication

Auth mirrors the mobile app:

- `POST /auth/login` returns `{ access_token, refresh_token, user }`.
- Tokens are persisted to `localStorage` under `access_token` / `refresh_token`; the user is cached under `auth_user`.
- An axios request interceptor attaches `Authorization: Bearer <access_token>`.
- A response interceptor catches `401`, calls `POST /auth/refresh` with `{ refresh_token }`, retries the original request once, and logs the user out if the refresh fails. Parallel 401s share a single in-flight refresh.
- `ProtectedRoute` guards every authenticated route; `PublicOnlyRoute` bounces signed-in users away from the auth screens.

## Project structure

```
cctv-records-web/
├── .env.example
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx              # Routes
    ├── index.css            # Tailwind layer + tokens
    ├── main.tsx             # QueryClient, Router, Auth, Toaster
    ├── vite-env.d.ts
    ├── api/
    │   ├── auth.ts          # login, register, forgot/change password
    │   ├── client.ts        # axios + interceptors + token storage keys
    │   └── sites.ts         # CRUD + generateReport
    ├── components/
    │   ├── AuthLayout.tsx
    │   ├── Button.tsx
    │   ├── ImageUploadField.tsx
    │   ├── Layout.tsx
    │   ├── ProtectedRoute.tsx
    │   ├── SelectField.tsx
    │   ├── SiteForm.tsx     # full nested form (RHF + Zod)
    │   ├── Spinner.tsx
    │   └── TextField.tsx
    ├── hooks/
    │   ├── useAuth.tsx
    │   └── useSites.ts      # React Query queries + mutations
    ├── pages/
    │   ├── ChangePasswordPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── EditSitePage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   ├── LoginPage.tsx
    │   ├── NewSitePage.tsx
    │   ├── NotFoundPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── SiteDetailPage.tsx
    │   └── SitesListPage.tsx
    ├── types/
    │   └── index.ts         # mirrors backend enums + Site shape
    └── utils/
        ├── authSchema.ts
        ├── helpers.ts
        └── siteSchema.ts    # Zod schema for the site form
```

## Routes

| Path | Auth | Page |
|------|------|------|
| `/login` | public-only | Sign in |
| `/register` | public-only | Self-service registration (pending approval) |
| `/forgot-password` | public-only | Request reset link |
| `/change-password?token=…` | public-only | Set new password using token |
| `/dashboard` | protected | Stats + report generator |
| `/sites` | protected | List + search + filter by region / scope |
| `/sites/new` | protected | Create site |
| `/sites/:id` | protected | Site detail (with images) + delete |
| `/sites/:id/edit` | protected | Edit site |
