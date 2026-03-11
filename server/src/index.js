require('dotenv').config();
const app = require('./app');
const { connectDb } = require('./db/database');

const PORT = process.env.PORT || 5000;

// Initialize database
connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 CrediWise API running at http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  });
