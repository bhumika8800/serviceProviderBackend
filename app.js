const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const cartRoutes = require('./routes/cartRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const queryRoutes = require('./routes/queryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/', (req, res) => {
  res.send('Service Provider Backend');
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1', serviceRoutes);
app.use('/api/v1', cartRoutes);
app.use('/api/v1', bookingRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', notificationRoutes);
app.use('/api/v1', reviewRoutes);
app.use('/api/v1', complaintRoutes);
app.use('/api/v1', queryRoutes);
app.use('/api/v1', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
