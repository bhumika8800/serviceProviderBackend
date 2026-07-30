# Authentication Flow (Firebase OTP → JWT)

1. User enters phone number on the login screen.
2. App calls Firebase Auth `signInWithPhoneNumber`; Firebase sends an SMS OTP.
3. User enters the OTP; app verifies it with Firebase and receives an ID token + Firebase UID.
4. App sends the Firebase ID token to the backend: `POST /auth/verify`.
5. Backend verifies the token via the Firebase Admin SDK.
   - Invalid/expired → reject request.
   - Valid → extract `phone_number` + `firebase_uid`.
6. Backend looks up the user by `firebase_uid`:
   - **Exists** → fetch user, update `last_login_at`.
   - **Doesn't exist** → create a new user (role: customer, is_active: true, profile_complete: false).
7. On first creation, trigger a system notification ("Welcome to the platform").
8. Backend issues its own JWT to the app; the app stores it and attaches it as `Authorization: Bearer <token>` on every subsequent request.
9. If `profile_complete` is false, the app prompts for first name, last name, email, and address, then calls an update endpoint to mark the profile complete.
10. On every later request, the backend verifies the JWT (Firebase handles token refresh on-device separately for re-auth scenarios).
