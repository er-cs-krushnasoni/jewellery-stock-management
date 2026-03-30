// JEWELLERY-STOCK-MANAGEMENT-APP/backend/index.js
require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const entriesRouter = require('./routes/entries');
const metadataRoutes = require("./routes/metadata");
const userRoutes = require("./routes/users");
const salesRoutes = require("./routes/sales");
const configRoutes = require("./routes/config");
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

const SECRET_API_KEY = process.env.SECRET_API_KEY || 'your-super-secret-key-12345';
const ENABLE_API_KEY_CHECK = process.env.ENABLE_API_KEY_CHECK === 'true';

// ── Build allowed origins from env ───────────────────────────────────────
// ALLOWED_ORIGINS is a comma-separated list in .env
// Falls back to localhost defaults if not set
const buildAllowedOrigins = () => {
  const defaults = [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
  ];

  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    // Merge env origins with defaults (deduped)
    return [...new Set([...defaults, ...envOrigins])];
  }

  return defaults;
};

const allowedOrigins = buildAllowedOrigins();

console.log('🌐 Allowed origins:', allowedOrigins.join(', '));

// ── Optional API Key Middleware ──────────────────────────────────────────
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-secret-key'];

  if (req.path === '/api/health') return next();

  if (apiKey) {
    if (apiKey !== SECRET_API_KEY) {
      console.log('❌ Invalid API key provided');
      return res.status(403).json({ message: 'Access denied - Invalid API credentials' });
    }
    console.log('✅ Valid API key - Proxy access granted');
  } else {
    console.log('🌐 Direct access (no API key) - Allowed');
  }

  next();
});

// ── CORS ─────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: function (origin, callback) {
    // Allow no-origin requests (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      // In development allow anyway but log it
      // In production you may want: callback(new Error('Not allowed by CORS'))
      callback(null, process.env.NODE_ENV !== 'production');
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With',
    'Accept', 'Origin', 'X-API-Secret-Key'
  ],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ── Additional CORS headers for iframe compatibility ─────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Secret-Key');

  if (req.method === 'OPTIONS') return res.status(204).end();

  next();
});

// ── Security headers ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  const icon = req.headers['x-api-secret-key'] ? '🔐' : '🌐';
  console.log(`${icon} ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ── Health check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    accessMode: req.headers['x-api-secret-key'] ? 'proxy' : 'direct',
  });
});

// ── Routes ───────────────────────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/entries', entriesRouter);
app.use("/api/metadata", metadataRoutes);
app.use("/api/config", configRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportsRouter);

// ── Error handling ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

// ── Start ─────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ Connected to MongoDB");
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 API key check: ${ENABLE_API_KEY_CHECK ? 'ENABLED' : 'DISABLED'}`);
  });
})
.catch((err) => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});