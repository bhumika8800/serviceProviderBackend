# Folder Structure

```
backend/
│
├── config/
│   ├── db.js            ✅ implemented
│   ├── firebase.js      ✅ implemented
│   ├── cloudinary.js    ✅ implemented
│   └── razorpay.js      ✅ implemented
│
├── controllers/
│   ├── authController.js ✅ implemented
│   ├── userController.js ✅ implemented
│   ├── serviceController.js ✅ implemented
│   ├── cartController.js ✅ implemented
│   ├── bookingController.js ✅ implemented
│   ├── paymentController.js ✅ implemented
│   ├── complaintController.js ✅ implemented
│   ├── notificationController.js ✅ implemented
│   ├── reviewController.js ✅ implemented
│   ├── queryController.js ✅ implemented
│   └── adminController.js ✅ implemented
│
├── middleware/
│   ├── authMiddleware.js ✅ implemented
│   ├── adminMiddleware.js ✅ implemented
│   ├── uploadMiddleware.js ✅ implemented
│   └── errorMiddleware.js ✅ implemented
│
├── models/
│   ├── User.js          ✅ implemented
│   ├── Category.js      ✅ implemented
│   ├── Service.js       ✅ implemented
│   ├── Booking.js       ✅ implemented
│   ├── Payment.js       ✅ implemented
│   ├── Notification.js  ✅ implemented
│   ├── Complaint.js     ✅ implemented
│   ├── Review.js        ✅ implemented
│   └── Query.js         ✅ implemented
│
├── routes/
│   ├── authRoutes.js    ✅ implemented
│   ├── userRoutes.js    ✅ implemented
│   ├── serviceRoutes.js ✅ implemented
│   ├── cartRoutes.js    ✅ implemented
│   ├── bookingRoutes.js ✅ implemented
│   ├── paymentRoutes.js ✅ implemented
│   ├── reviewRoutes.js  ✅ implemented
│   ├── complaintRoutes.js ✅ implemented
│   ├── notificationRoutes.js ✅ implemented
│   ├── queryRoutes.js   ✅ implemented
│   └── adminRoutes.js   ✅ implemented
│
├── utils/
│   ├── ApiError.js      ✅ implemented
│   ├── serialize.js     ✅ implemented (camelCase serializer)
│   ├── validate.js      ✅ implemented
│   ├── notification.js  ✅ implemented (in-app + FCM push)
│   ├── fcm.js           ✅ implemented (Firebase Cloud Messaging)
│   └── seed.js          ✅ implemented (6 categories + 18 services)
├── uploads/
├── app.js               ✅ implemented (middleware + route mounting)
├── server.js            ✅ implemented (startup: dotenv + DB + listen)
├── index.js             ✅ entry point (requires server.js)
└── .env / .env.example
```