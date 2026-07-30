# Data Model

The database uses MongoDB with Mongoose. Key design decisions:

- **Addresses & cart items** are embedded inside User (one-to-few embed pattern) since they're bounded and always read together with the user.
- **Categories** got their own collection (with parent_id for sub-categories) instead of a plain array field on Service.
- **Payments** are a separate collection from Bookings (not embedded) since they form a growing audit trail queried independently for reconciliation.
- **Reviews** are split out from Complaints — a rating belongs to a completed booking, not a complaint — and kept in their own collection since a popular service could accumulate thousands of them (avoids the 16MB document cap).
- **Bookings** store a service_snapshot and address_snapshot (extended reference pattern) so a later price change or deleted address can't corrupt historical orders.

## Collections

### User

| Field | Type | Notes |
|-------|------|-------|
| first_name, last_name | String | required |
| email | String | required, unique, lowercase |
| phone | String | required (string to preserve leading zeros/country code) |
| img_url | String | |
| role | enum: customer, provider, admin | default: customer |
| addresses | [Address subdocument] | embedded |
| cart_items | [{service_id, quantity, added_at}] | embedded |
| is_active | Boolean | default true |
| created_at / updated_at | Date | |

### Category

| Field | Type |
|-------|------|
| parent_id | ObjectId (self-ref, nullable) |
| name | String, unique |
| is_active | Boolean |

### Service

| Field | Type | Notes |
|-------|------|-------|
| category_id | ObjectId → Category | |
| name | String | merges old "name" + "title" |
| description | String | |
| price | Decimal128 | avoids float rounding issues |
| duration_mins | Number | |
| images | [String] | |
| tags | [String] | multikey index |
| avg_rating, review_count | Number | cached, updated on review create/edit |
| is_active | Boolean | |

### Booking

| Field | Type | Notes |
|-------|------|-------|
| user_id | ObjectId → User | |
| service_snapshot | {service_id, name, price} | extended reference |
| address_snapshot | {line1, line2, city, state, pincode, country, lat, lng} | extended reference |
| booking_date | Date | full datetime |
| total_amount | Decimal128 | |
| status | enum: pending, confirmed, in_progress, completed, cancelled | |
| is_active | Boolean | |

### Payment

| Field | Type | Notes |
|-------|------|-------|
| booking_id | ObjectId → Booking | |
| payment_mode | enum: card, upi, netbanking, wallet, cash | |
| transaction_id | String | gateway IDs are alphanumeric |
| amount | Decimal128 | |
| status | enum: pending, successful, failed, refunded | |
| payment_date | Date | |

### Notification

| Field | Type |
|-------|------|
| user_id | ObjectId → User |
| type | enum: booking, payment, complaint, promotion, system |
| title, message | String |
| reference_id | ObjectId (e.g. booking_id) |
| is_read | Boolean |

### Complaint

| Field | Type | Notes |
|-------|------|-------|
| booking_id | ObjectId → Booking | |
| user_id | ObjectId → User | |
| title, description | String | |
| status | enum: open, in_progress, resolved, closed | |
| resolution_notes | String | |
| resolved_at | Date | |

### Review

| Field | Type | Notes |
|-------|------|-------|
| booking_id | ObjectId → Booking, unique | |
| user_id | ObjectId → User | |
| service_id | ObjectId → Service | |
| rating | Number (1–5) | |
| comment | String | |

### Query (contact-us / lead form)

| Field | Type | Notes |
|-------|------|-------|
| user_id | ObjectId → User, nullable | guests can submit |
| name, email, phone | String | |
| title, message | String | |
| status | enum: open, closed | |
