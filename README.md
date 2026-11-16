# Win Computer Business Management System

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- Online deployment, Owner first-run setup, Namecheap DNS and HTTPS handoff: [`DEPLOYMENT-NAMECHEAP.md`](./DEPLOYMENT-NAMECHEAP.md)

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.

## Account approval workflow

The application supports a public **Request access** flow without enabling uncontrolled self-registration. Applicants choose User/Staff or Admin, submit contact and position details, upload a compressed profile photo, and wait in a pending state. Only the Owner can review the request, approve or reject it, and create the active account/profile. Admins cannot approve account creation.

The Owner Team page also includes live presence monitoring. Authenticated sessions send a short heartbeat, so Owner/Admin users can see the current online count, person, role, last-seen time and device class (Phone, Tablet, Laptop/PC or Desktop). Session tokens and passwords are never displayed.

The first Owner account remains protected by the separate `WIN_APPROVAL_PASSWORD` production secret. If that secret is not configured, the setup form intentionally stays locked rather than falling back to a default password.
