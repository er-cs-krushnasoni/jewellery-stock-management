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

// Secret API Key (optional - only for proxy access)
const SECRET_API_KEY = process.env.SECRET_API_KEY || 'your-super-secret-key-12345';
const ENABLE_API_KEY_CHECK = process.env.ENABLE_API_KEY_CHECK === 'true';

// Optional API Key Middleware - Only checks if key is provided
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-secret-key'];
  
  // Allow health check without key
  if (req.path === '/api/health') {
    return next();
  }
  
  // If API key is provided, validate it
  if (apiKey) {
    if (apiKey !== SECRET_API_KEY) {
      console.log('❌ Invalid API key provided');
      return res.status(403).json({ 
        message: 'Access denied - Invalid API credentials' 
      });
    }
    console.log('✅ Valid API key - Proxy access granted');
  } else {
    // No API key = Direct browser access (allowed)
    console.log('🌐 Direct access (no API key) - Allowed');
  }
  
  next();
});

// CORS configuration - FIXED for iframe + credentials
const allowedOrigins = [
  'http://localhost:5173',  // Hidden project frontend (standalone)
  'http://localhost:8080',  // Main calculator app
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(null, true); // Still allow, but log it
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Secret-Key'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Additional CORS headers for iframe compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // If origin is allowed, set it explicitly (required for credentials)
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Secret-Key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Security headers
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const hasApiKey = req.headers['x-api-secret-key'] ? '🔐' : '🌐';
  console.log(`${hasApiKey} ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Jewellery stock management backend is running',
    accessMode: req.headers['x-api-secret-key'] ? 'proxy' : 'direct'
  });
});

// Routes (accessible both ways)
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/entries', entriesRouter);
app.use("/api/metadata", metadataRoutes);
app.use("/api/config", configRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path 
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Local: http://localhost:${PORT}`);
      console.log(`🌐 Direct browser access: ENABLED`);
      console.log(`🔐 Proxy access with API key: ENABLED`);
      console.log(`🔗 Allowed origins:`, allowedOrigins.join(', '));
      if (SECRET_API_KEY) {
        console.log(`🔑 API Key configured: ***${SECRET_API_KEY.slice(-4)}`);
      }
      console.log(`💡 Use VS Code port forwarding to access remotely`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });