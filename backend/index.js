// index.js (Backend Entry Point)
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/auth");
// const entries = require("./routes/entries");
const entriesRouter = require('./routes/entries'); 
const metadataRoutes = require("./routes/metadata");
const userRoutes = require("./routes/users");
const salesRoutes = require("./routes/sales"); 
const config = require("./routes/config")
const reportsRouter = require('./routes/reports'); 

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://svvhqp0l-5173.inc1.devtunnels.ms',
      'https://svvhqp0l-8080.inc1.devtunnels.ms',
      'https://svvhqp0l-8081.inc1.devtunnels.ms'
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
// app.use("/api/entries", entries.router);
app.use('/api/entries', entriesRouter);
app.use("/api/metadata", metadataRoutes);
app.use("/api/config", require("./routes/config"));
app.use("/api/sales", salesRoutes); // Add sales routes
app.use("/api/reports", reportsRouter);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });




// // index.js (Backend Entry Point)
// const express = require("express");
// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const authRoutes = require("./routes/auth");
// const entriesRouter = require('./routes/entries'); 
// const metadataRoutes = require("./routes/metadata");
// const userRoutes = require("./routes/users");
// const salesRoutes = require("./routes/sales"); 
// const configRoutes = require("./routes/config"); // Fixed: use consistent naming
// const reportsRouter = require('./routes/reports'); 

// // Load env vars
// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Enhanced CORS configuration for calculator integration
// app.use(
//   cors({
//     origin: [
//       // Your existing origins
//       'http://localhost:5173',
//       'https://svvhqp0l-5173.inc1.devtunnels.ms',
      
//       // Add calculator origin
//       'https://svvhqp0l-8080.inc1.devtunnels.ms',
      
//       // Add localhost for development
//       'http://localhost:8080',
//       'http://localhost:3000',
      
//       // Add any other origins you might need
//       'https://localhost:8080'
//     ],
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//     optionsSuccessStatus: 200 // Some legacy browsers choke on 204
//   })
// );

// // Add preflight handling
// app.options('*', cors());

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Add a simple health check endpoint for the calculator
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'healthy', 
//     timestamp: new Date().toISOString(),
//     message: 'Hidden project backend is running' 
//   });
// });

// // Routes
// app.use("/api/users", userRoutes);
// app.use("/api/auth", authRoutes);
// app.use('/api/entries', entriesRouter);
// app.use("/api/metadata", metadataRoutes);
// app.use("/api/config", configRoutes); // Fixed: use the variable instead of require again
// app.use("/api/sales", salesRoutes);
// app.use("/api/reports", reportsRouter);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ message: 'Something went wrong!' });
// });

// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ message: 'Route not found' });
// });

// // Connect to MongoDB
// mongoose
//   .connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => {
//     console.log("✅ Connected to MongoDB");
//     app.listen(PORT, () => {
//       console.log(`🚀 Server running on port ${PORT}`);
//       console.log(`📱 Calculator can access at: https://svvhqp0l-${PORT}.inc1.devtunnels.ms`);
//     });
//   })
//   .catch((err) => {
//     console.error("❌ MongoDB connection error:", err);
//   });

// const express = require("express");
// const app = express();

// console.log("Starting route loading test...\n");

// try {
//   console.log("1. Loading auth...");
//   const authRoutes = require("./routes/auth");
//   console.log("✅ auth loaded\n");
// } catch (e) {
//   console.error("❌ auth FAILED:", e.message);
//   process.exit(1);
// }

// try {
//   console.log("2. Loading config...");
//   const configRoutes = require("./routes/config");
//   console.log("✅ config loaded\n");
// } catch (e) {
//   console.error("❌ config FAILED:", e.message);
//   process.exit(1);
// }

// try {
//   console.log("3. Loading entries...");
//   const entriesRoutes = require("./routes/entries");
//   console.log("✅ entries loaded\n");
// } catch (e) {
//   console.error("❌ entries FAILED:", e.message);
//   process.exit(1);
// }

// try {
//   console.log("4. Loading metadata...");
//   const metadataRoutes = require("./routes/metadata");
//   console.log("✅ metadata loaded\n");
// } catch (e) {
//   console.error("❌ metadata FAILED:", e.message);
//   process.exit(1);
// }

// try {
//   console.log("5. Loading sales...");
//   const salesRoutes = require("./routes/sales");
//   console.log("✅ sales loaded\n");
// } catch (e) {
//   console.error("❌ sales FAILED:", e.message);
//   process.exit(1);
// }

// try {
//   console.log("6. Loading users...");
//   const usersRoutes = require("./routes/users");
//   console.log("✅ users loaded\n");
// } catch (e) {
//   console.error("❌ users FAILED:", e.message);
//   process.exit(1);
// }

// try {
//   console.log("7. Loading reports...");
//   const reportsRoutes = require("./routes/reports");
//   console.log("✅ reports loaded\n");
// } catch (e) {
//   console.error("❌ reports FAILED:", e.message);
//   process.exit(1);
// }

// console.log("🎉 ALL ROUTES LOADED SUCCESSFULLY!");
// app.listen(5000, () => console.log("Server started on port 5000"));