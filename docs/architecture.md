# High-Level Architecture

```
React Native App
      │
      │  (Firebase ID Token, then JWT on subsequent calls)
      ▼
Express.js API Gateway
      │
      ├── Middleware: Morgan (logging) → CORS → Firebase Admin verify → JWT auth → Express Validator
      │
      ├── Controllers ──> Services (business logic) ──> Mongoose Models ──> MongoDB
      │
      ├── Integrations:
      │      ├── Firebase Admin SDK (auth verification)
      │      ├── Firebase Cloud Messaging (push notifications)
      │      ├── Razorpay SDK (payments/webhooks)
      │      └── Cloudinary SDK (image upload/storage)
      │
      └── Error handler (centralized) ──> Standard JSON error response
```
