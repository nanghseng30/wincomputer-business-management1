# Win Computer Online Web App — Plan

## Product scope

Win Computer ကို Namecheap domain မှ ဝင်ရောက်အသုံးပြုနိုင်သော professional online business management web app အဖြစ် တည်ဆောက်မည်။ Existing ZIP ထဲရှိ React/Express/tRPC/Drizzle source ကို အခြေခံပြီး database-backed online workflow အဖြစ် ဆက်လက်အသုံးချမည်။ Normal customer များသည် အမည်၊ ဖုန်း/အီးမေးလ်နှင့် password ဖြင့် အလွယ်တကူ self-register/login ဝင်နိုင်မည်။ Admin, Staff, Accountant, General Worker, Technician, Sales, Marketing နှင့် Talent စသည့် လုပ်ငန်းရာထူး account များသည် Owner approval ရပြီးမှသာ အသုံးပြုနိုင်မည်။ Owner သည် pending staff/admin requests များကို စစ်ဆေးပြီးသာ account activation ပြုလုပ်မည်။ Existing source ၏ username/password application login ကို rate limit, scrypt password hashing, signed sessions နှင့် server-side role/capability authorization တို့ဖြင့် ဆက်လက်အသုံးချမည်။

## Implementation approach

- Existing `client/src/pages`, `server/routers.ts`, `drizzle/schema.ts`, migrations နှင့် supplied Win Computer logo ကို reuse လုပ်မည်။
- Managed MySQL database သည် users, roles, permissions, prices, products/services, receipts, refunds, audit records, notices နှင့် settings များ၏ source of truth ဖြစ်မည်။
- `wc_account_requests` သည် Owner approval လိုသော staff/admin/job-role requests များကို pending/approved/rejected status, requested role, contact/profile fields, compressed profile photo, reviewer, decision note နှင့် audit trail ဖြင့် သိမ်းမည်။ Customer self-registration သည် separate customer account flow ဖြင့် ချက်ချင်း active ဖြစ်မည်။ Approval သည် transaction တစ်ခုအတွင်း `wc_users` နှင့် `wc_employee_profiles` သို့ account/profile ပြောင်းပေးမည်။
- `wc_sessions` တွင် last-seen time, device class, device label နှင့် user-agent metadata သိမ်းပြီး heartbeat ဖြင့် online state ကို update မည်။ Owner/Admin သည် လက်ရှိ online user count၊ အမည်၊ role၊ last seen နှင့် phone/tablet/laptop/desktop ခွဲခြားချက်ကိုသာ မြင်မည်၊ raw credentials မည်သည့်နေရာတွင်မျှ မပြမည်။
- `server/routers.ts` တွင် owner/admin/protected procedures ကို server-side စစ်ဆေးပြီး client-side hide/show ကို security အဖြစ် မမှီခိုစေရ။ Admin/Owner သည် non-owner accounts များကို deactivate/restore/remove ပြုလုပ်နိုင်ပြီး Owner account ကို မဖျက်နိုင်စေရ။
- Owner-only controls တွင် brand/settings, account request approval, user roles, sensitive import/restore နှင့် global notices ကို ထည့်မည်။ Admin သည် approved account requests ကို မအတည်ပြုနိုင်ပါ။ Admin/Owner သည် account status ကို စီမံနိုင်မည်။ နေ့စဉ် operational price/catalog/service access သည် Owner သတ်မှတ်ပေးသော capability ဖြင့် Admin သို့မဟုတ် approved Staff ကိုသာ ခွင့်ပြုမည်။
- Dashboard သည် actual database data မှ receipts, payment status, service categories နှင့် recent activity ကို table နှင့် chart title များဖြင့် ပြသမည်။ Daily totals, received/pending, payment method နှင့် service/product summaries များကို fictional data မသုံးဘဲ empty-state ဖြင့် ပြသမည်။
- Bilingual Burmese/English labels, responsive sidebar, compact table/cards, clear status badges နှင့် confirmation dialogs သုံးမည်။ Phone, tablet, laptop နှင့် desktop screen widths တွင် navigation, forms, tables နှင့် receipt preview များကို မျက်နှာပြင်အလိုက် ပြန်စီပေးမည်။
- Namecheap ကို domain registrar အဖြစ်သာ သတ်မှတ်ပြီး DNS/HTTPS configuration ကို production host ၏ final URL ရရှိပြီးမှ A/AAAA/CNAME records ဖြင့် ချိတ်မည်။ Domain ဝယ်ယူခြင်းနှင့် DNS ပြောင်းခြင်းကို app code ထဲမှ မလုပ်မည်။

## Project structure

- `client/src/pages/` — Dashboard, Workspace, Business, Catalog, Administration, Roles, receipts, notices and settings views.
- `client/src/components/` — authenticated shell, navigation, AI/utility components and UI primitives.
- `server/routers.ts` — auth-aware business, registration-request approval, presence/device monitoring, administration, roles, notices, catalog, receipt and audit procedures.
- `server/security.ts` — session, password/approval and rate-limit helpers where applicable.
- `drizzle/schema.ts`, `drizzle/*.sql` — application tables and additive migrations.
- `client/public/` — supplied logo and route manifest.
- `Dockerfile`, `self-host/`, `.env.example` — production container and optional self-host guidance.

## Design

### Style options

- Swiss International operations desk — probability 0.07; strict hierarchy, precise status, compact data density.
- Dark executive control room — probability 0.05; high contrast, strong ownership cues, focused actions.
- Modern ledger studio — probability 0.08; paper-like surfaces, structured tables, calm accounting language.

**Chosen style: Dark executive control room.**

### Design Movement

A restrained dark operations-console aesthetic with Swiss grid discipline and premium gold action accents. It should feel like a reliable business instrument rather than a marketing site.

### Core Principles

1. Every number is traceable to a database record or clearly marked unavailable.
2. Owner-only actions are visibly separated from daily staff workflows.
3. High information density is balanced with generous spacing and readable bilingual labels.
4. Destructive or financial actions require explicit confirmation and an audit trail.

### Color Philosophy

Black and navy establish focus, privacy and operational seriousness. Gold is the ownable Win Computer accent reserved for active navigation, primary actions and important highlights. Cool gray surfaces create separation without introducing decorative noise. Green, amber and red are reserved for real business statuses.

### Layout Paradigm

A persistent left operations rail anchors navigation on desktop; the main workspace uses a wide reading column with summary cards, an activity stream and table sections rather than centered marketing blocks. On mobile, the rail collapses into a top bar and the same hierarchy becomes a stacked command flow.

### Signature Elements

- Gold vertical rail marker for the active section.
- Dark glass-like summary cards with a thin gold edge and a single key metric.
- Bilingual status chips that pair English labels with concise Burmese context.

### Interaction Philosophy

Users should always know what is selected, what changed, and who may perform the action. Inline forms use clear validation and non-destructive defaults. Owner actions include a second confirmation layer where the action changes roles, settings, data or payment records.

### Animation

Use short 150–220ms fades and slide transitions for page changes, drawer open/close and success feedback. Avoid continuous motion. Respect `prefers-reduced-motion` and never animate financial values in a way that obscures the underlying number.

### Typography System

Use an English system sans stack with a Myanmar-capable fallback such as `Noto Sans Myanmar`, keeping headings compact and semi-bold, body text at comfortable reading size, and table metadata smaller but never below accessible contrast. Numbers use tabular figures where available.

### Brand Essence

Win Computer is the dependable digital desk for a computer-service business: precise, controlled and accountable.

### Brand Voice

Headlines are direct and operational. CTAs name the result, not the process. Example lines: “Record today’s service clearly.” / “ဤပြောင်းလဲမှုကို Owner ခွင့်ပြုချက်ဖြင့်သာ သိမ်းမည်။”

### Wordmark & Logo

Keep the supplied Win Computer logo as the primary mark in the login surface, navigation rail and receipt/export header. Do not replace it with a generic text logo.

### Signature Brand Color

Win Computer Gold `#DCAF47` is the signature accent for active state and trusted action.

## Account, profile and presence experience

The login surface has three distinct states: first-time Owner setup, secure sign-in, and “Request access”. The request form is intentionally respectful and explicit: applicants see that submission is only a request, that the Owner reviews every field, and that no account is active until approval. The form is split into identity/access fields and a profile section with a compressed image upload preview. After Owner approval, the new account receives a profile-completion step before entering the workspace.

The Owner’s Team area gains two adjacent panels: “Pending account requests” for review/approve/reject with applicant details and photo, and “Online now” for live presence. Online presence is based on a short heartbeat window, not a permanent online claim. Each row shows the person, role, last seen time and a friendly device class such as Phone, Tablet, Laptop or Desktop. The server remains authoritative for approval, activation, profile persistence and presence queries; client visibility is not treated as a security boundary.

## POS and accounting upgrade

The existing catalog and receipt procedures will be reused for a new POS workspace section. Operators can select active products/services, adjust quantities, enter customer and payment details, review the exact cart total, and create a receipt with item-level references. A dedicated “စာရင်းများ / Accounts” section will consolidate income, expenses and profit/loss tables and provide daily, weekly, monthly and yearly formula-ready Excel exports. The existing administration group will remain visibly labeled with Team, Roles, Activity log, Permissions, Notices and Owner Settings headings/links. Catalog actions will retain explicit Add Product, Add Service, Add Category and price edit controls with validation and audit logging.
