# Notification Triggers

| Event | Notification Type |
|-------|-------------------|
| Booking status → Confirmed | booking |
| Payment status → Failed | payment |
| Complaint status changes | complaint |
| Promotional campaign sent | promotion |
| New user created | system |

Notifications are persisted in MongoDB and pushed to the device via Firebase Cloud Messaging (FCM).
