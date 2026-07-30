# Security & Validation

- All protected routes verify the JWT via middleware before hitting the controller.
- Firebase ID tokens are verified server-side using the Firebase Admin SDK — never trust a client-asserted UID.
- Request bodies are validated with Express Validator at the route layer before reaching business logic.
- Razorpay payment verification uses HMAC signature validation on both the client-confirm call and the webhook, so payment status is never trusted from the client alone.
- Passwords aren't stored — auth is entirely OTP/Firebase-based.
- Role-based access control (customer, provider, admin) gates service/booking-status/complaint-status mutation endpoints.
- Rate limiting recommended on `/auth/verify` and `/queries` to prevent OTP/spam abuse.
