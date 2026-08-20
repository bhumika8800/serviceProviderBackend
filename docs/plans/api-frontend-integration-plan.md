# Backend API Development & Frontend Integration Plan

> **Status:** In progress — Phases 0–10 executed (contract, app shell, auth, users, categories & services, cart, bookings, payments, notifications, reviews, complaints, queries); Phase 11 admin done. See [§9 Progress Tracker](#9-progress-tracker).

## 1. Goal

Build the complete Express.js API surface defined in `docs/api-endpoints.md` (backend) so that the React Native app (`D:\Projects\ServiceProviderApp`) can move from mock data to live API calls. This plan:

1. Audits the current backend and frontend state.
2. Aligns the **API contract** between the two codebases (field naming, response envelope, auth payload).
3. Provides a phased backend build checklist.
4. Provides a frontend integration workstream (services, store persistence, mock → API swap).
5. Defines order of work and verification.

---

## 2. Current State Audit

### 2.1 Backend — `D:\Projects\ServiceProviderBackend`

| Area | Status | Details |
|------|--------|---------|
| Express app | ✅ | `app.js`/`server.js` split; `index.js` entry; middleware chain morgan → CORS → json → `/api/v1` routes → 404 → error handler. |
| Database | ✅ | MongoDB Atlas connected via Mongoose 9 (`config/db.js`, DNS-fallback built in). |
| Models | ✅ | All 9 models exist in `models/`; `created_at`/`updated_at` timestamps; User has `firebase_uid`/`profile_complete`, address `label`/`is_default`; Service has text + category indexes. |
| Routes / Controllers | 🟡 | auth + user + service done (Phases 1–3); booking, payment, notification, review, complaint, query, admin pending. |
| Middleware | 🟡 | `authMiddleware` (`requireAuth`/`requireRoles`), `errorMiddleware`, `uploadMiddleware` done; cart/booking RBA via existing `requireRoles`. |
| Integrations | 🟡 | `config/firebase.js` + `config/cloudinary.js` done; `config/razorpay.js` pending (Phase 6). |
| Validation / Logging / CORS / Rate limit | ✅ | express-validator + `utils/validate.js` on all bodies; morgan, cors, express-rate-limit (auth verify). |
| Dependencies installed | ✅ | jwt, validator, cors, morgan, rate-limit, firebase-admin, multer, cloudinary, razorpay installed. |

### 2.2 Frontend — `D:\Projects\ServiceProviderApp`

| Area | Status | Details |
|------|--------|---------|
| API client | ✅ | `src/services/apiClient.ts` — axios, baseURL `http://localhost:3000/api/v1`, JWT `Authorization` interceptor, 401 → auto logout, normalizes errors to `{ message, code, status }`. |
| Firebase auth | ✅ | `src/services/authService.ts` — OTP send/verify, Google sign-in → returns Firebase ID token. |
| TanStack Query hooks | 🟡 | `useServices.ts`, `useBookings.ts` exist and call `apiClient` directly. |
| Service layer modules | ❌ | `userService.ts`, `servicesCatalog.ts`, `bookingService.ts`, `notificationService.ts` are **empty stubs**. |
| Auth store | 🟡 | `useAuthStore.ts` exists but **no persistence** (token lost on restart; conventions.md specifies AsyncStorage `persist`). |
| Booking store | ❌ | `useBookingStore.ts` empty stub. |
| Screens | 🟡 | Home, Services, MyBookings use **mock data** (`src/data/`). ServiceDetail, Booking, Profile are placeholders. |
| Types | ✅ | `src/types/index.ts` — camelCase interfaces matching what the API should return. |

### 2.3 Backend docs (source of truth)

`docs/api-endpoints.md`, `docs/error-handling.md`, `docs/security.md`, `docs/notification-triggers.md`, `docs/business-flows.md`, `docs/authentication-flow.md`, `docs/data-model.md` fully define the target behavior. The frontend `docs/context/backend.md` mirrors them.

---

## 3. API Contract Alignment (do this first — it blocks everything)

The frontend types and the backend models do **not** match. Either the backend must serialize to the frontend's camelCase shape, or the frontend types must be changed to snake_case.

### 3.1 Field mapping table

| Frontend type (camelCase) | Backend model field (snake_case) | Notes |
|---------------------------|-----------------------------------|-------|
| `User.id` | `User._id` | Convert `_id` → `id` in responses. |
| `User.firebaseUid` | `User.firebase_uid` | ✅ added (unique, sparse) for `/auth/verify` lookups. |
| `User.profileComplete` | `User.profile_complete` | ✅ added (Boolean, default false). |
| `User.firstName` | `User.first_name` | |
| `User.lastName` | `User.last_name` | |
| `User.avatar` | `User.img_url` | |
| `User.isActive` | `User.is_active` | |
| `User.role: 'customer' \| 'admin' \| 'service_provider'` | `role: 'customer' \| 'provider' \| 'admin'` | **Conflict**: `service_provider` vs `provider`. Pick one. |
| `Address.label` (`home/work/other`) | `address.label` | ✅ added to addressSchema. |
| `Address.isDefault` | `address.is_default` | ✅ added (Boolean). |
| `Address.lat/lng` | `address.lat/lng` | Matches — ok. (frontend db-table.md said latitude/longitude; use `lat/lng`.) |
| `Service.categoryId` | `Service.category_id` | |
| `Service.durationMins` | `Service.duration_mins` | |
| `Service.avgRating` | `Service.avg_rating` | |
| `Service.reviewCount` | `Service.review_count` | |
| `Service.isActive` | `Service.is_active` | |
| `Category.parentId` | `Category.parent_id` | |
| `Booking.userId` | `Booking.user_id` | |
| `Booking.serviceSnapshot.serviceId` | `Booking.service_snapshot.service_id` | |
| `Booking.addressSnapshot` | `Booking.address_snapshot` | Same `lat/lng` mapping. |
| `Booking.bookingDate` | `Booking.booking_date` | |
| `Booking.totalAmount` | `Booking.total_amount` | Decimal128 → serialize as Number/String. |
| `Booking.status` values | same enums | ok. |
| `createdAt/updatedAt` | `created_at/updated_at` | |

### 3.2 Response envelope

Frontend `ApiResponse<T>` expects:

```json
{ "success": true, "data": { ... } }
```

with pagination as `{ success, data: [], pagination: { page, limit, total, totalPages } }` and errors as `{ success: false, message, code }` (see `docs/error-handling.md`, `docs/conventions.md` of frontend).

### 3.3 Auth contract (already wired on frontend — backend must match)

- `POST /api/v1/auth/verify` body: `{ "idToken": "<Firebase ID token>" }`
- Response body must be: `{ "success": true, "data": { "token": "<JWT>", "user": { ...User } } }`
  (LoginScreen.tsx:74 and OtpScreen.tsx:67 destructure `data.user` / `data.token`.)

### 3.4 Decision (CONFIRMED — camelCase)

**Backend returns camelCase JSON; DB stays snake_case.** ✅ decided

- Add a lightweight serializer per model (`utils/serialize.js`) or a `toJSON` transform on each Mongoose schema mapping `_id→id`, `created_at→createdAt`, etc. Keeps the existing frontend types 100% intact and matches the frontend docs' conventions.

**Model changes required regardless of the above:**
1. `User`: add `firebase_uid` (unique, indexed) + `profile_complete` (Boolean, default false). ✅ done
2. `User` address subdocument: add `label` (enum home/work/other) + `is_default` (Boolean). Use `lat`/`lng` (already present). ✅ done
3. `User.role`: resolve `service_provider` vs `provider` (recommend backend enum `customer|provider|admin`, and update the frontend `UserRole` type to `'customer' | 'provider' | 'admin'`). ✅ backend done (`customer|provider|admin`); frontend `UserRole` still needs updating.
4. Add Mongoose `timestamps` to models that the docs list `created_at/updated_at` on (User, Service, Booking, Payment, Notification, Complaint, Review, Query) — currently only `User` has timestamps. ✅ done (all listed models).

---

## 4. Backend Build Phases

Each phase is independent and shippable. Routes mount under `/api/v1`.

### Phase 0 — App shell, middleware, dependencies

- Split `index.js` → `app.js` (express app + middleware + routes) + `server.js` (start server). Keep `index.js` as the entry (`require('./server')` or keep root mount).
- Install: `jsonwebtoken`, `express-validator`, `cors`, `morgan`, `express-rate-limit`, `firebase-admin`, `multer`, `cloudinary`, `razorpay`.
- `app.js` middleware chain (per `docs/architecture.md`): `morgan` → `cors` → `express.json()` → `/api/v1` routes → 404 handler → error handler.
- Create `middleware/errorMiddleware.js` — centralized error handler producing `{ success:false, message, code }` (422/401/404/409/400/500 per `docs/error-handling.md`).
- Create `utils/ApiError.js` (or `AppError`) + `utils/serialize.js` (field mapping from §3).
- Deliverables: server runs, 404 + error shape verified.

### Phase 1 — Auth

- `config/firebase.js` — Firebase Admin SDK init from env.
- `middleware/authMiddleware.js` — `requireAuth` (verify `Authorization: Bearer <JWT>` with `jsonwebtoken`, load user, attach to `req`).
- `controllers/authController.js` + `routes/authRoutes.js`:
  - `POST /auth/verify` — verify Firebase ID token via Admin SDK; find user by `firebase_uid` or create (`role: customer`, `profile_complete: false`); issue JWT (`JWT_SECRET`, `JWT_EXPIRY`); welcome notification for new users; return `{ token, user }`.
  - `POST /auth/complete-profile` — set name/email/address, `profile_complete: true`.
  - `POST /auth/logout` — no-op server-side (client drops token).
- Rate limit `/auth/verify`.
- Deliverable: OTP/Google login returns JWT + user; both LoginScreen and OtpScreen work.

### Phase 2 — Users & profile

- `controllers/userController.js`, `routes/userRoutes.js`:
  - `GET /users/me`, `PATCH /users/me`
  - `POST/PATCH/DELETE /users/me/addresses/:addressId?`
  - `POST /users/me/upload-image` — Multer → Cloudinary (`config/cloudinary.js`), save `img_url`.
- `middleware/adminMiddleware.js` for role gates.
- Deliverable: Profile screen + address management live.

### Phase 3 — Categories & Services

- `controllers/serviceController.js`, `routes/serviceRoutes.js`:
  - `GET /categories` (parent/sub filtering)
  - `GET /services` (filters: `category_id`, `tags`, text search, pagination) — add `{ name:'text', description:'text' }` index
  - `GET /services/:id`
  - `POST /services`, `PATCH /services/:id`, `DELETE /services/:id` (soft delete) — admin/provider
- Seed script (`utils/seed.js`) using the 6 categories + 18 services from `src/data/mockServices.ts` so the app has data on day one.
- Deliverable: Home + Services screens live from DB.

### Phase 4 — Cart

- `routes` on `/cart` (operates on `User.cart_items[]`): `GET /cart`, `POST /cart`, `PATCH /cart/:serviceId`, `DELETE /cart/:serviceId`, `DELETE /cart`.
- Deliverable: cart add/remove/update/clear live.

### Phase 5 — Bookings

- `controllers/bookingController.js`, `routes/bookingRoutes.js`:
  - `POST /bookings` — snapshot service (`service_id,name,price`) + address; `status: pending`.
  - `GET /bookings` (status filter), `GET /bookings/:id`
  - `PATCH /bookings/:id/cancel` (pending/confirmed only)
  - `PATCH /bookings/:id/status` (admin/provider)
- Add booking indexes (`user_id`, `service_snapshot.service_id`, `booking_date`, `status`).
- Deliverable: booking creation + MyBookings live (active/history tabs).

### Phase 6 — Payments (Razorpay)

- `config/razorpay.js`, `controllers/paymentController.js`, `routes/paymentRoutes.js`:
  - `POST /payments/create-order`
  - `POST /payments/verify` (HMAC signature)
  - `POST /payments/webhook` (verify webhook secret)
  - `GET /payments/:bookingId`
- On success → booking `confirmed` + notification. On failure → `payment` notification.
- Deliverable: checkout → payment → booking confirmed.

### Phase 7 — Notifications

- `controllers/notificationController.js`, `routes/notificationRoutes.js`:
  - `GET /notifications` (paginated, unread-first), `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`
- FCM send util (`utils/fcm.js`) + in-app notification persisted (see `docs/notification-triggers.md`).
- Deliverable: notification list + read/unread + push.

### Phase 8 — Reviews

- `controllers/reviewController.js`, `routes/reviewRoutes.js`:
  - `POST /reviews` (completed booking only, one per booking) — transactionally update `Service.avg_rating`/`review_count`.
  - `GET /services/:id/reviews`
- Deliverable: rating + comment, avg_rating caching.

### Phase 9 — Complaints

- `controllers/complaintController.js`, `routes/complaintRoutes.js`:
  - `POST /complaints`, `GET /complaints`, `GET /complaints/:id`, `PATCH /complaints/:id/status` (admin → notification).
- Deliverable: complaint filing + admin resolution.

### Phase 10 — Queries (contact us)

- `controllers/queryController.js`, `routes/queryRoutes.js`:
  - `POST /queries` (guest or logged-in; user_id nullable), `GET /queries` (admin), `PATCH /queries/:id/close`.
- Rate limit `/queries`.
- Deliverable: contact form works for guests.

### Phase 11 — Admin endpoints & security hardening

- Admin user list/block endpoints (frontend AdminClientsScreen) + dashboard aggregates (booking counts, revenue, active users).
- Harden per `docs/security.md` + frontend `conventions.md`: JWT on all protected routes, RBAC on mutations, express-validator on all bodies, sanitization (NoSQL injection), rate limits.

---

## 5. Frontend Integration Workstream

Runs in parallel with backend phases. Depends on §3 contract decisions.

### 5.1 Base URL configuration

`apiClient.ts:4` hardcodes `http://localhost:3000/api/v1`.

- Move to env/config: `src/utils/constants.ts` → `API_BASE_URL` read from React Native config or `.env`.
- **Android emulator** must use `http://10.0.2.2:3000/api/v1`; **physical device** must use the machine's LAN IP; iOS simulator can use `localhost`.
- Backend must enable CORS for these origins.

### 5.2 Fill empty service modules (after §3 contract is fixed)

| Module | Implements |
|--------|------------|
| `src/services/servicesCatalog.ts` | `listCategories()`, `listServices(params)`, `getService(id)` |
| `src/services/bookingService.ts` | `createBooking()`, `listBookings(status)`, `getBooking(id)`, `cancelBooking(id)` |
| `src/services/userService.ts` | `getMe()`, `updateProfile()`, `addAddress()`, `updateAddress()`, `deleteAddress()`, `uploadImage()` |
| `src/services/notificationService.ts` | `listNotifications()`, `markRead(id)`, `markAllRead()` |

- Refactor `useServices.ts` / `useBookings.ts` to call these service modules (per `docs/context/conventions.md` — API functions live in `src/services/`, hooks call them).

### 5.3 Auth store persistence

- Wrap `useAuthStore` with `persist` + AsyncStorage (per `docs/context/conventions.md` §6) so tokens/session survive app restarts. Currently `isAuthenticated`/`token` reset on launch.
- Consider session restore on app start (call `GET /users/me` to validate stored token; logout on 401 is already handled by the axios interceptor).

### 5.4 Mock → API swap matrix

| Screen | Mock source | Replace with | Backend phase |
|--------|-------------|--------------|---------------|
| ServicesScreen | `mockServices.ts` | `useCategories` + `useServices` | Phase 3 |
| ServiceDetailScreen | placeholder → mock lookup | `useService(id)` | Phase 3 |
| HomeScreen (featured/popular) | mock | `useServices` + filters | Phase 3 |
| MyBookingsScreen | `mockBookings.ts` | `useBookings(status)` | Phase 5 |
| BookingScreen (create) | placeholder | `useCreateBooking` + address select | Phase 5 |
| ProfileScreen | `mockUser.ts` / `mockAddresses.ts` | `useUserProfile` + address CRUD | Phase 2 |
| Notifications | — | `useNotifications` | Phase 7 |
| Admin screens | mock | Admin APIs | Phase 11 |

- Keep mock files until each screen's API is verified; delete `src/data/mock*.ts` only after all consumers are migrated.

### 5.5 Auth flow wiring

- After `login()` succeeds, check `user.profileComplete === false` → route to a **CompleteProfile** screen before showing tabs (auth flow step 8 in `docs/authentication-flow.md`). This screen does not exist yet — add to `RootStackParamList` and `AppNavigator`.
- Guests: no `/auth/verify` call; `loginAsGuest()` already bypasses auth gate.

---

## 6. Dependency Order (recommended sequence)

```
Contract alignment (§3)  →  Backend Phase 0  →  Phase 1 (auth)
  → Phase 2 (users)  →  Phase 3 (services+seed)  →  Phase 4 (cart)
  → Phase 5 (bookings)  →  Phase 6 (payments)
  → Phase 7 (notifications)  →  Phase 8 (reviews)  →  Phase 9 (complaints)
  → Phase 10 (queries)  →  Phase 11 (admin + hardening)
Frontend: §5.1 (base URL) → §5.3 (store persistence) → §5.2 (services)
  → §5.4 (screen-by-screen mock swap) → §5.5 (profile completion flow)
```

Critical path: **contract → auth → services seed → bookings** (enables the primary user journey). Payments/notifications/admin are independent add-ons.

---

## 7. Verification Plan

- **Per phase:** curl the endpoints against `http://localhost:3000/api/v1`; verify status codes + `{ success, data }` / `{ success:false, message, code }` shapes.
- **Contract tests:** assert that returned JSON for User/Service/Booking matches `src/types/index.ts` exactly (no snake_case leaks).
- **End-to-end:** run app on Android emulator (base URL `10.0.2.2`), complete: OTP login → profile → browse → book → (mock) pay → see booking in MyBookings.
- **Negative cases:** wrong token (401), expired token (401 → auto logout), validation error (422), not-found (404).

---

## 8. Risks / Notes

- **Decimal128 serialization:** Mongoose returns `Decimal128` as Buffer-like objects; serialize price/amount to Number or String in the serializer or frontend will break. (Handled in `utils/serialize.js`.)
- **`role` naming conflict** (`service_provider` vs `provider`) must be resolved before auth lands, or `AdminTabNavigator` role checks break. (Backend enum is `customer|provider|admin`; frontend `UserRole` type still says `service_provider` — update it in the frontend workstream.)
- **`firebase_uid` / `profile_complete`** are new required User fields — add them before Phase 1; existing Atlas `users` documents will lack them (handle gracefully or reseed).
- **CORS + network:** emulator/device networking is a common first blocker — set `API_BASE_URL` correctly and verify backend CORS.
- **`GET /users/me` on session restore** — implement in Phase 2 so `persist` can validate stored tokens.
- **firebase-admin v14** uses modular imports (`firebase-admin/app`, `firebase-admin/auth`, `firebase-admin/messaging`); `admin.credential`/`admin.apps` no longer exist on the root export.

---

## 9. Progress Tracker

| Item | Status |
|------|--------|
| §3 Contract — User model: `firebase_uid` (unique sparse), `profile_complete`, address `label`/`is_default` | ✅ |
| §3 Contract — timestamps on Service, Booking, Payment, Notification, Complaint, Review, Query | ✅ |
| §3 Contract — camelCase serializer `utils/serialize.js` (Decimal128→Number, ObjectId→String, `_id`→`id`) | ✅ |
| §3 Contract — User `first_name`/`email` relaxed to optional (auth creates users with phone only) | ✅ |
| Phase 0 — deps installed (jwt, validator, cors, morgan, rate-limit, firebase-admin, multer, cloudinary, razorpay) | ✅ |
| Phase 0 — `app.js` + `server.js` split; `index.js` → entry | ✅ |
| Phase 0 — `middleware/errorMiddleware.js` (notFound + errorHandler, error codes per docs) | ✅ |
| Phase 0 — `utils/ApiError.js`, `utils/validate.js` | ✅ |
| Phase 1 — `config/firebase.js` (firebase-admin v14, lazy init) | ✅ |
| Phase 1 — `middleware/authMiddleware.js` (`requireAuth`, `requireRoles`) | ✅ |
| Phase 1 — `controllers/authController.js` + `routes/authRoutes.js` (`/auth/verify`, `/complete-profile`, `/logout`) + rate limit | ✅ |
| Verified — server boots, Atlas connects, 404/401/422/500 shapes correct, indexes sync | ✅ |
| Phase 2 — Users & profile (`GET/PATCH /users/me`, address CRUD, upload-image) | ✅ |
| Phase 2 — `config/cloudinary.js` + `middleware/uploadMiddleware.js` (Multer memory storage) | ✅ |
| Phase 2 — camelCase request bodies (`firstName`, `avatar`, `isDefault`…) + `img_url`→`avatar` in serializer | ✅ |
| Phase 3 — Categories & Services (`GET /categories`, services CRUD with filters/pagination, text index, soft delete, RBAC) | ✅ |
| Phase 3 — `utils/seed.js` (6 categories + 18 services, `--reset` flag) | ✅ |
| Phase 4 — Cart (`GET/POST /cart`, `PATCH/DELETE /cart/:serviceId`, `DELETE /cart`, RBAC via `requireAuth`) | ✅ |
| Phase 4 — Cart response enriched with service details (name, price, images) + qty cap (1–99) | ✅ |
| Phase 5 — Bookings (create with service+address snapshots, list w/ status filter, detail, cancel, admin/provider status update, lifecycle validation, indexes) | ✅ |
| Phase 6 — Payments (Razorpay create-order, HMAC verify, webhook w/ secret + raw body, payment records; booking→confirmed on success, notifications) | ✅ |
| Phase 7 — Notifications (list unread-first, mark read, mark-all-read; `utils/notification.js` + `utils/fcm.js`; `User.fcm_token`) | ✅ |
| Phase 8 — Reviews (completed-booking-only, one per booking via unique index, transactional avg_rating/review_count, service reviews) | ✅ |
| Phase 9 — Complaints (file against completed booking, list/detail, admin status update → complaint notification) | ✅ |
| Phase 10 — Queries (guest or logged-in via `optionalAuth`, admin list, admin close, rate limit) | ✅ |
| Phase 11 — Admin (user list/search, block/unblock, dashboard stats) + hardening (JWT on all protected routes, RBAC, validator on all bodies, rawBody capture for webhooks) | ✅ |
| Frontend workstream (§5) | ⬜ |
