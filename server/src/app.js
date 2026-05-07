require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const expensesRoutes = require('./routes/expenses');
const instrumentsRoutes = require('./routes/instruments');
const analyticsRoutes = require('./routes/analytics');
const recommendRoutes = require('./routes/recommend');
const cardsRoutes = require('./routes/cards');
const optimizerRoutes = require('./routes/optimizer');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/instruments', instrumentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/optimizer', optimizerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
