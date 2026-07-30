# Folder Structure

```
backend/
│
├── config/
│   ├── db.js
│   ├── firebase.js
│   ├── cloudinary.js
│   └── razorpay.js
│
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── serviceController.js
│   ├── bookingController.js
│   ├── paymentController.js
│   ├── complaintController.js
│   ├── notificationController.js
│   └── reviewController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── adminMiddleware.js
│   ├── uploadMiddleware.js
│   └── errorMiddleware.js
│
├── models/
│   ├── User.js
│   ├── Category.js
│   ├── Service.js
│   ├── Booking.js
│   ├── Payment.js
│   ├── Notification.js
│   ├── Complaint.js
│   ├── Review.js
│   └── Query.js
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── serviceRoutes.js
│   ├── bookingRoutes.js
│   ├── paymentRoutes.js
│   ├── reviewRoutes.js
│   ├── complaintRoutes.js
│   └── notificationRoutes.js
│
├── utils/
├── uploads/
├── app.js
├── server.js
└── .env
```
