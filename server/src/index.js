require('dotenv').config();
const app = require('./app');
const { getDb } = require('./db/database');

const PORT = process.env.PORT || 5000;

// Initialize database
try {
  getDb();
  console.log('✅ Database initialized successfully');
} catch (err) {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`🚀 CrediWise API running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
