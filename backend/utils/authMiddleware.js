// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");

// const SECRET = process.env.JWT_SECRET || "very_secret_key"; // Store in .env

// // Hash password
// const hashPassword = async (password) => {
// const salt = await bcrypt.genSalt(10);
// return await bcrypt.hash(password, salt);
// };

// // Verify password
// const verifyPassword = async (password, hash) => {
// return await bcrypt.compare(password, hash);
// };

// // Generate JWT token
// const generateToken = (user) => {
// return jwt.sign({ userId: user._id }, SECRET, { expiresIn: "7d" }); // optional expiry
// };

// // Verify JWT token
// const verifyToken = (token) => {
// return jwt.verify(token, SECRET);
// };

// module.exports = {
// hashPassword,
// verifyPassword,
// generateToken,
// verifyToken
// };


const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // Changed from "bcrypt" to "bcryptjs"

const SECRET = process.env.JWT_SECRET || "very_secret_key"; // Store in .env

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Verify password
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ userId: user._id }, SECRET, { expiresIn: "7d" }); // optional expiry
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};