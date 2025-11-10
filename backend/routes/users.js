// const express = require("express");
// const router = express.Router();
// const bcrypt = require("bcryptjs");
// const User = require("../models/User");
// const { hashPassword } = require("../utils/authMiddleware");
// const requireAuth = require("../middleware/requireAuth");
// const Entry = require("../models/Entry");
// const Metadata = require("../models/Metadata");
// const Sales = require("../models/Sales");

// // Add logging middleware to see all requests to this router
// router.use((req, res, next) => {
//   console.log(`[USERS ROUTE] ${req.method} ${req.path} - ${new Date().toISOString()}`);
//   console.log(`[USERS ROUTE] Headers:`, req.headers);
//   console.log(`[USERS ROUTE] Body:`, req.body);
//   next();
// });

// // Test route to verify the router is working (NO AUTH REQUIRED)
// router.get("/test", (req, res) => {
//   console.log("=== TEST ROUTE HIT ===");
//   res.json({ message: "Users router is working" });
// });

// // IMPORTANT: Put specific routes BEFORE parameterized routes
// // @route PUT /api/users/reset-password
// // @desc Reset password for logged-in user
// // @access Private (any authenticated user)
// router.put("/reset-password", requireAuth, async (req, res) => {
//   console.log("=== RESET PASSWORD ROUTE HIT ===");
//   console.log("Request received at:", new Date().toISOString());
  
//   try {
//     // Log everything step by step
//     console.log("Step 1: Route handler started");
//     console.log("User ID from token:", req.userId);
//     console.log("Request body keys:", Object.keys(req.body));
    
//     const { currentPassword, newPassword } = req.body;
//     console.log("Step 2: Extracted passwords from body");
//     console.log("Current password provided:", !!currentPassword);
//     console.log("New password provided:", !!newPassword);

//     // Validate required fields
//     if (!currentPassword || !newPassword) {
//       console.log("Step 3: Validation failed - missing fields");
//       return res.status(400).json({ 
//         error: "Current password and new password are required" 
//       });
//     }
//     console.log("Step 3: Validation passed");

//     // Find the user by ID from the token
//     console.log("Step 4: Looking for user with ID:", req.userId);
    
//     let user;
//     try {
//       user = await User.findById(req.userId);
//       console.log("Step 5: User query completed");
//     } catch (dbError) {
//       console.error("Database error when finding user:", dbError);
//       return res.status(500).json({ error: "Database error" });
//     }
    
//     if (!user) {
//       console.log("Step 6: User not found");
//       return res.status(404).json({ error: "User not found" });
//     }
//     console.log("Step 6: User found:", user.username);

//     // Verify current password using bcrypt.compare directly
//     console.log("Step 7: Verifying current password");
//     let isCurrentPasswordValid;
//     try {
//       isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
//       console.log("Step 8: Password verification completed, result:", isCurrentPasswordValid);
//     } catch (bcryptError) {
//       console.error("Bcrypt error:", bcryptError);
//       return res.status(500).json({ error: "Password verification error" });
//     }
    
//     if (!isCurrentPasswordValid) {
//       console.log("Step 9: Current password is incorrect");
//       return res.status(400).json({ error: "Current password is incorrect" });
//     }
//     console.log("Step 9: Current password verified successfully");

//     // Hash new password
//     console.log("Step 10: Hashing new password");
//     let newPasswordHash;
//     try {
//       newPasswordHash = await hashPassword(newPassword);
//       console.log("Step 11: New password hashed successfully");
//     } catch (hashError) {
//       console.error("Password hashing error:", hashError);
//       return res.status(500).json({ error: "Password hashing error" });
//     }

//     // Update user's password
//     console.log("Step 12: Updating user password in database");
//     try {
//       const updatedUser = await User.findByIdAndUpdate(
//         req.userId, 
//         { passwordHash: newPasswordHash },
//         { new: true }
//       );
      
//       if (!updatedUser) {
//         console.log("Step 13: Failed to update user password");
//         return res.status(500).json({ error: "Failed to update password" });
//       }
      
//       console.log("Step 13: Password updated successfully for user:", updatedUser.username);
//     } catch (updateError) {
//       console.error("Database update error:", updateError);
//       return res.status(500).json({ error: "Database update error" });
//     }

//     console.log("Step 14: Sending success response");
//     res.json({ 
//       message: "Password reset successfully",
//       username: user.username 
//     });
//     console.log("Step 15: Response sent successfully");

//   } catch (err) {
//     console.error("=== UNEXPECTED ERROR IN RESET PASSWORD ROUTE ===");
//     console.error("Error:", err);
//     console.error("Error message:", err.message);
//     console.error("Error stack:", err.stack);
//     res.status(500).json({ 
//       error: "Password reset failed", 
//       details: err.message 
//     });
//   }
// });

// // Middleware to verify admin token (from .env)
// const verifyAdmin = (req, res, next) => {
//   const token = req.headers["x-admin-token"];
//   if (!token || token !== process.env.ADMIN_TOKEN) {
//     return res.status(403).json({ error: "Unauthorized" });
//   }
//   next();
// };

// // @route POST /api/users/register
// // @desc Admin creates a new user
// // @access Admin
// router.post("/register", requireAuth, async (req, res) => {
//   console.log("=== REGISTER ROUTE HIT ===");
//   try {
//     const { username, password, isAdmin = false } = req.body;

//     if (!username || !password) {
//       return res.status(400).json({ error: "Username and password required" });
//     }

//     const requestingUser = await User.findById(req.userId);
//     console.log("Register attempted by:", requestingUser);

//     if (!requestingUser || requestingUser.isAdmin !== true) {
//       return res.status(403).json({ error: "Only admins can create users" });
//     }

//     const existing = await User.findOne({ username });
//     if (existing) {
//       return res.status(409).json({ error: "Username already exists" });
//     }

//     const passwordHash = await hashPassword(password);
//     const user = new User({ username, passwordHash, isAdmin });
//     await user.save();

//     res.status(201).json({ message: "User created successfully" });
//   } catch (err) {
//     console.error("Admin register error:", err);
//     res.status(500).json({ error: "User creation failed" });
//   }
// });

// // @route GET /api/users
// // @desc Get list of users
// // @access Admin
// router.get("/", requireAuth, async (req, res) => {
//   console.log("=== GET USERS ROUTE HIT ===");
//   try {
//     const users = await User.find({}, "username _id");
//     res.json(users);
//   } catch (err) {
//     res.status(500).json({ error: "Error fetching users" });
//   }
// });

// // @route PUT /api/users/:id
// // @desc Update user's username or password
// // @access Admin
// router.put("/:id", requireAuth, async (req, res) => {
//   console.log("=== UPDATE USER BY ID ROUTE HIT ===");
//   console.log("User ID param:", req.params.id);
//   try {
//     const { username, password } = req.body;
//     const updates = {};
//     if (username) updates.username = username;
//     if (password) updates.passwordHash = await bcrypt.hash(password, 10);
    
//     const updated = await User.findByIdAndUpdate(req.params.id, updates, {
//       new: true,
//     });
    
//     if (!updated) return res.status(404).json({ error: "User not found" });
    
//     res.json({ message: "User updated", updatedUser: updated });
//   } catch (err) {
//     res.status(500).json({ error: "Error updating user", details: err.message });
//   }
// });

// // @route DELETE /api/users/:id
// // @desc Delete a user
// // @access Admin
// router.delete("/:id", requireAuth, async (req, res) => {
//   console.log("=== DELETE USER BY ID ROUTE HIT ===");
//   console.log("User ID param:", req.params.id);
  
//   try {
//     const userId = req.params.id;
    
//     // Check if user exists
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
    
//     // Start a transaction to ensure all-or-nothing deletion
//     const session = await mongoose.startSession();
//     session.startTransaction();
    
//     try {
//       // Delete all related data in order
//       const entriesDeleted = await Entry.deleteMany({ userId }).session(session);
//       const metadataDeleted = await Metadata.deleteMany({ userId }).session(session);
//       const salesDeleted = await Sales.deleteMany({ userId }).session(session);
//       const userDeleted = await User.findByIdAndDelete(userId).session(session);
      
//       // Commit the transaction
//       await session.commitTransaction();
      
//       console.log(`Deleted user ${userId} and related data:`, {
//         entries: entriesDeleted.deletedCount,
//         metadata: metadataDeleted.deletedCount,
//         sales: salesDeleted.deletedCount
//       });
      
//       res.json({ 
//         message: "User and all related data deleted successfully",
//         deletedCounts: {
//           entries: entriesDeleted.deletedCount,
//           metadata: metadataDeleted.deletedCount,
//           sales: salesDeleted.deletedCount
//         }
//       });
      
//     } catch (error) {
//       // Rollback transaction on error
//       await session.abortTransaction();
//       throw error;
//     } finally {
//       session.endSession();
//     }
    
//   } catch (err) {
//     console.error("Error in cascade delete:", err);
//     res.status(500).json({ 
//       error: "Error deleting user and related data", 
//       details: err.message 
//     });
//   }
// });

// module.exports = router;



const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose"); // ADDED: Missing import
const User = require("../models/User");
const { hashPassword } = require("../utils/authMiddleware");
const requireAuth = require("../middleware/requireAuth");
const Entry = require("../models/Entry");
const Metadata = require("../models/Metadata");
const Sales = require("../models/Sales");

// Add logging middleware
router.use((req, res, next) => {
  console.log(`[USERS ROUTE] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// IMPORTANT: ALL SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES (:id)

// Test route (NO AUTH REQUIRED)
router.get("/test", (req, res) => {
  console.log("=== TEST ROUTE HIT ===");
  res.json({ message: "Users router is working" });
});

// @route POST /api/users/register
// @desc Admin creates a new user
// @access Admin
router.post("/register", requireAuth, async (req, res) => {
  console.log("=== REGISTER ROUTE HIT ===");
  try {
    const { username, password, isAdmin = false } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const requestingUser = await User.findById(req.userId);
    console.log("Register attempted by:", requestingUser);

    if (!requestingUser || requestingUser.isAdmin !== true) {
      return res.status(403).json({ error: "Only admins can create users" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const passwordHash = await hashPassword(password);
    const user = new User({ username, passwordHash, isAdmin });
    await user.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Admin register error:", err);
    res.status(500).json({ error: "User creation failed" });
  }
});

// @route PUT /api/users/reset-password
// @desc Reset password for logged-in user
// @access Private (any authenticated user)
router.put("/reset-password", requireAuth, async (req, res) => {
  console.log("=== RESET PASSWORD ROUTE HIT ===");
  console.log("Request received at:", new Date().toISOString());
  
  try {
    console.log("Step 1: Route handler started");
    console.log("User ID from token:", req.userId);
    
    const { currentPassword, newPassword } = req.body;
    console.log("Step 2: Extracted passwords from body");

    // Validate required fields
    if (!currentPassword || !newPassword) {
      console.log("Step 3: Validation failed - missing fields");
      return res.status(400).json({ 
        error: "Current password and new password are required" 
      });
    }
    console.log("Step 3: Validation passed");

    // Find the user
    console.log("Step 4: Looking for user with ID:", req.userId);
    
    let user;
    try {
      user = await User.findById(req.userId);
      console.log("Step 5: User query completed");
    } catch (dbError) {
      console.error("Database error when finding user:", dbError);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (!user) {
      console.log("Step 6: User not found");
      return res.status(404).json({ error: "User not found" });
    }
    console.log("Step 6: User found:", user.username);

    // Verify current password
    console.log("Step 7: Verifying current password");
    let isCurrentPasswordValid;
    try {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      console.log("Step 8: Password verification completed, result:", isCurrentPasswordValid);
    } catch (bcryptError) {
      console.error("Bcrypt error:", bcryptError);
      return res.status(500).json({ error: "Password verification error" });
    }
    
    if (!isCurrentPasswordValid) {
      console.log("Step 9: Current password is incorrect");
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    console.log("Step 9: Current password verified successfully");

    // Hash new password
    console.log("Step 10: Hashing new password");
    let newPasswordHash;
    try {
      newPasswordHash = await hashPassword(newPassword);
      console.log("Step 11: New password hashed successfully");
    } catch (hashError) {
      console.error("Password hashing error:", hashError);
      return res.status(500).json({ error: "Password hashing error" });
    }

    // Update user's password
    console.log("Step 12: Updating user password in database");
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.userId, 
        { passwordHash: newPasswordHash },
        { new: true }
      );
      
      if (!updatedUser) {
        console.log("Step 13: Failed to update user password");
        return res.status(500).json({ error: "Failed to update password" });
      }
      
      console.log("Step 13: Password updated successfully for user:", updatedUser.username);
    } catch (updateError) {
      console.error("Database update error:", updateError);
      return res.status(500).json({ error: "Database update error" });
    }

    console.log("Step 14: Sending success response");
    res.json({ 
      message: "Password reset successfully",
      username: user.username 
    });
    console.log("Step 15: Response sent successfully");

  } catch (err) {
    console.error("=== UNEXPECTED ERROR IN RESET PASSWORD ROUTE ===");
    console.error("Error:", err);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: "Password reset failed", 
      details: err.message 
    });
  }
});

// @route GET /api/users
// @desc Get list of users
// @access Admin
router.get("/", requireAuth, async (req, res) => {
  console.log("=== GET USERS ROUTE HIT ===");
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

// PARAMETERIZED ROUTES MUST COME LAST

// @route PUT /api/users/:id
// @desc Update user's username or password
// @access Admin
router.put("/:id", requireAuth, async (req, res) => {
  console.log("=== UPDATE USER BY ID ROUTE HIT ===");
  console.log("User ID param:", req.params.id);
  try {
    const { username, password } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);
    
    const updated = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    
    if (!updated) return res.status(404).json({ error: "User not found" });
    
    res.json({ message: "User updated", updatedUser: updated });
  } catch (err) {
    res.status(500).json({ error: "Error updating user", details: err.message });
  }
});

// @route DELETE /api/users/:id
// @desc Delete a user
// @access Admin
router.delete("/:id", requireAuth, async (req, res) => {
  console.log("=== DELETE USER BY ID ROUTE HIT ===");
  console.log("User ID param:", req.params.id);
  
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Start a transaction to ensure all-or-nothing deletion
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Delete all related data in order
      const entriesDeleted = await Entry.deleteMany({ userId }).session(session);
      const metadataDeleted = await Metadata.deleteMany({ userId }).session(session);
      const salesDeleted = await Sales.deleteMany({ userId }).session(session);
      const userDeleted = await User.findByIdAndDelete(userId).session(session);
      
      // Commit the transaction
      await session.commitTransaction();
      
      console.log(`Deleted user ${userId} and related data:`, {
        entries: entriesDeleted.deletedCount,
        metadata: metadataDeleted.deletedCount,
        sales: salesDeleted.deletedCount
      });
      
      res.json({ 
        message: "User and all related data deleted successfully",
        deletedCounts: {
          entries: entriesDeleted.deletedCount,
          metadata: metadataDeleted.deletedCount,
          sales: salesDeleted.deletedCount
        }
      });
      
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (err) {
    console.error("Error in cascade delete:", err);
    res.status(500).json({ 
      error: "Error deleting user and related data", 
      details: err.message 
    });
  }
});

module.exports = router;