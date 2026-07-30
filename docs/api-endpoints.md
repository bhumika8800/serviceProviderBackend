# API Endpoints

All routes are prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <JWT>`.

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/verify | Verify Firebase ID token, create/fetch user, issue JWT |
| POST | /auth/complete-profile | Complete profile (name, email, address) |
| POST | /auth/logout | Invalidate session/token client-side |

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/me | Get current user profile |
| PATCH | /users/me | Update profile |
| POST | /users/me/addresses | Add address |
| PATCH | /users/me/addresses/:addressId | Update address |
| DELETE | /users/me/addresses/:addressId | Remove address |
| POST | /users/me/upload-image | Upload profile image (Multer → Cloudinary) |

## Categories & Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /categories | List categories (supports parent/sub filtering) |
| GET | /services | List/search services (query: category, tags, text search, pagination) |
| GET | /services/:id | Service detail (incl. avg_rating, review_count) |
| POST | /services | Create service (admin/provider) |
| PATCH | /services/:id | Update service (admin/provider) |
| DELETE | /services/:id | Deactivate service (admin/provider) |

## Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cart | Get current cart items (embedded on user) |
| POST | /cart | Add item to cart |
| PATCH | /cart/:serviceId | Update quantity |
| DELETE | /cart/:serviceId | Remove item |
| DELETE | /cart | Clear cart |

## Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /bookings | Create booking (snapshot service + address, status: pending) |
| GET | /bookings | List current user's bookings (filter by status) |
| GET | /bookings/:id | Booking detail |
| PATCH | /bookings/:id/cancel | Cancel booking (pending/confirmed only) |
| PATCH | /bookings/:id/status | Update status (admin/provider — confirmed/in_progress/completed) |

## Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /payments/create-order | Create Razorpay order for a booking |
| POST | /payments/verify | Verify Razorpay payment signature, mark payment + booking status |
| POST | /payments/webhook | Razorpay webhook (handles async success/failure/refund events) |
| GET | /payments/:bookingId | Get payment record(s) for a booking |

## Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /reviews | Submit review for a completed booking (updates service avg_rating/review_count) |
| GET | /services/:id/reviews | List reviews for a service |

## Complaints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /complaints | File complaint against a booking |
| GET | /complaints | List current user's complaints |
| GET | /complaints/:id | Complaint detail |
| PATCH | /complaints/:id/status | Update status (admin — triggers notification) |

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notifications | List current user's notifications (paginated, unread-first) |
| PATCH | /notifications/:id/read | Mark as read |
| PATCH | /notifications/read-all | Mark all as read |

## Queries (Contact Us)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /queries | Submit a query (guest or logged-in) |
| GET | /queries | List queries (admin) |
| PATCH | /queries/:id/close | Mark resolved/closed (admin) |
