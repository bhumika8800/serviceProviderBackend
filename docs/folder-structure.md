# Folder Structure

```
backend/
│
├── config/
│   ├── db.js            ✅ implemented
│   ├── firebase.js      ✅ implemented
│   ├── cloudinary.js    ✅ implemented
│   └── razorpay.js
│
├── controllers/
│   ├── authController.js ✅ implemented
│   ├── userController.js ✅ implemented
│   ├── serviceController.js
│   ├── bookingController.js
│   ├── paymentController.js
│   ├── complaintController.js
│   ├── notificationController.js
│   └── reviewController.js
│
├── middleware/
│   ├── authMiddleware.js ✅ implemented
│   ├── adminMiddleware.js
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
│   ├── serviceRoutes.js
│   ├── bookingRoutes.js
│   ├── paymentRoutes.js
│   ├── reviewRoutes.js
│   ├── complaintRoutes.js
│   └── notificationRoutes.js
│
├── utils/
│   ├── ApiError.js      ✅ implemented
│   ├── serialize.js     ✅ implemented (camelCase serializer)
│   └── validate.js      ✅ implemented
├── uploads/
├── app.js               ✅ implemented (middleware + route mounting)
├── server.js            ✅ implemented (startup: dotenv + DB + listen)
├── index.js             ✅ entry point (requires server.js)
└── .env / .env.example
```
