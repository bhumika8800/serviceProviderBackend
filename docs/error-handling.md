# Error Handling

Centralized Express error-handling middleware returns a consistent JSON shape:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "BOOKING_NOT_FOUND"
}
```

## Common Cases

| Scenario | HTTP Status |
|----------|-------------|
| Invalid/expired Firebase token | 401 |
| Invalid/expired JWT | 401 |
| Validation errors | 422 |
| Resource not found | 404 |
| Razorpay signature mismatch | 400 |
| Duplicate email/phone on signup | 409 |
