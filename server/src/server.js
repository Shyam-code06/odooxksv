import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import dotenv from 'dotenv';
import pool from './config/db.js';
import authRoutes from './modules/auth/authRoutes.js';
import userRoutes from './modules/user/userRoutes.js';
import auditLogRoutes from './modules/auditlog/auditLogRoutes.js';
import dashboardRoutes from './modules/dashboard/dashboardRoutes.js';
import vendorRoutes from './modules/vendor/vendorRoutes.js';
import rfqRoutes from './modules/rfq/rfqRoutes.js';
import quotationRoutes from './modules/quotation/quotationRoutes.js';
import approvalRoutes from './modules/approval/approvalRoutes.js';
import purchaseOrderRoutes from './modules/purchaseorder/purchaseOrderRoutes.js';
import invoiceRoutes from './modules/invoice/invoiceRoutes.js';
import notificationRoutes from './modules/notification/notificationRoutes.js';
import reportRoutes from './modules/report/reportRoutes.js';
import { AppError } from './utils/customErrors.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. GLOBAL SECURITY MIDDLEWARE
app.use(helmet());

// Configure CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // In production, specify front-end domain
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// 2. REQUEST PARSING
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Removed rate limiting as per user request

// 4. ROUTING
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auditlog', auditLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/rfq', rfqRoutes);
app.use('/api/quotation', quotationRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/purchaseorder', purchaseOrderRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/report', reportRoutes);

// Health Check Route
app.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    return res.status(200).json({
      success: true,
      message: 'Server is healthy and database is connected.',
      data: {
        timestamp: dbCheck.rows[0].now
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server health check failed. Database connection issue.',
      error: error.message
    });
  }
});

// 5. UNHANDLED ROUTES (404)
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

// 6. GLOBAL ERROR HANDLING MIDDLEWARE
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // Log non-operational errors for server investigation
  if (!err.isOperational) {
    console.error('SERVER ERROR 💥:', err);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: err.errors || null, // For validation errors
    meta: null
  });
});

// 7. START SERVER & VERIFY DB CONNECTION
async function startServer() {
  try {
    // Perform simple query to verify database connection pool works
    await pool.query('SELECT 1');
    console.log('Database connected successfully.');

    // Ensure quotation columns are present for the new workflow
    await pool.query(`
      ALTER TABLE quotation ADD COLUMN IF NOT EXISTS officerapproved BOOLEAN DEFAULT FALSE;
      ALTER TABLE quotation ADD COLUMN IF NOT EXISTS vendoraccepted BOOLEAN DEFAULT FALSE;
    `);
    console.log('Quotation schema verified/updated for new workflow.');

    app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed during startup:', error.message);
    process.exit(1);
  }
}

startServer();
