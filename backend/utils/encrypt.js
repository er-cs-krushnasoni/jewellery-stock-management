// const crypto = require("crypto");

// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "12345678901234567890123456789012"; // 32 bytes (256 bits)
// const IV_LENGTH = 16; // AES IV size

// const encryptData = (data) => {
//   try {
//     const iv = crypto.randomBytes(IV_LENGTH);
//     const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
//     let encrypted = cipher.update(typeof data === "string" ? data : JSON.stringify(data));
//     encrypted = Buffer.concat([encrypted, cipher.final()]);
//     return iv.toString("hex") + ":" + encrypted.toString("hex");
//   } catch (err) {
//     console.error("Encryption error:", err);
//     throw new Error("Encryption failed");
//   }
// };

// const decryptData = (encryptedData) => {
//   try {
//     const parts = encryptedData.split(":");
//     if (parts.length !== 2) throw new Error("Invalid encrypted data format");

//     const iv = Buffer.from(parts[0], "hex");
//     const encryptedText = Buffer.from(parts[1], "hex");
//     const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
//     let decrypted = decipher.update(encryptedText);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
//     return JSON.parse(decrypted.toString());
//   } catch (err) {
//     console.error("Decryption error:", err);
//     throw new Error("Decryption failed");
//   }
// };

// module.exports = {
//   encryptData,
//   decryptData
// };





// // FILE: utils/encrypt.js
// // CHAIN POSITION: 1/11

// // DEPENDENCIES: None (foundation file)
// // EXPORTS: encryptData, decryptData, createUserKey (backward compatible)

// const crypto = require("crypto");

// // Ensure dotenv is loaded (in case it's not loaded in main app)
// if (!process.env.ENCRYPTION_SECRET) {
//   try {
//     require('dotenv').config();
//   } catch (err) {
//     // dotenv might not be installed, that's okay if env vars are set another way
//   }
// }

// // Fix environment variable mismatch: use ENCRYPTION_SECRET (not ENCRYPTION_KEY)
// const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET;
// const IV_LENGTH = 16; // AES IV size
// const TAG_LENGTH = 16; // GCM authentication tag length

// // Validate encryption key exists
// if (!ENCRYPTION_KEY) {
//   console.error("Available environment variables:", Object.keys(process.env).filter(k => k.includes('ENCRYPT')));
//   console.error("Current working directory:", process.cwd());
//   console.error("Looking for .env file...");
//   throw new Error("ENCRYPTION_SECRET environment variable is required. Please check your .env file and ensure dotenv is loaded in your main app file.");
// }

// // Validate key length (must be 32 bytes for AES-256)
// if (ENCRYPTION_KEY.length !== 64) { // 64 hex chars = 32 bytes
//   console.error("ENCRYPTION_SECRET length:", ENCRYPTION_KEY.length);
//   throw new Error("ENCRYPTION_SECRET must be 64 characters (32 bytes in hex)");
// }

// // Convert hex string to buffer
// const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

// /**
//  * Detect if data uses old encryption format
//  * Old format: "iv:encrypted" (hex encoding)
//  * New format: "v1:iv:encrypted:tag" (base64 encoding)
//  */
// const isOldFormat = (encryptedData) => {
//   return !encryptedData.startsWith('v1:');
// };

// /**
//  * Encrypt data using AES-256-GCM (new format)
//  * @param {*} data - Data to encrypt (will be JSON stringified)
//  * @returns {string} - Encrypted data in format: "v1:iv:encrypted:tag" (base64)
//  */
// const encryptData = (data) => {
//   try {
//     const iv = crypto.randomBytes(IV_LENGTH);
//     const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
    
//     const plaintext = typeof data === "string" ? data : JSON.stringify(data);
//     let encrypted = cipher.update(plaintext, 'utf8');
//     encrypted = Buffer.concat([encrypted, cipher.final()]);
    
//     const tag = cipher.getAuthTag();
    
//     // New format: v1:iv:encrypted:tag (all base64 encoded)
//     return `v1:${iv.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`;
//   } catch (err) {
//     console.error("Encryption error:", err);
//     throw new Error("Encryption failed");
//   }
// };

// /**
//  * Decrypt data from old format (AES-256-CBC)
//  * @param {string} encryptedData - Data in format "iv:encrypted" (hex)
//  * @returns {*} - Decrypted and parsed data
//  */
// const decryptDataOld = (encryptedData) => {
//   try {
//     const parts = encryptedData.split(":");
//     if (parts.length !== 2) throw new Error("Invalid old encrypted data format");

//     const iv = Buffer.from(parts[0], "hex");
//     const encryptedText = Buffer.from(parts[1], "hex");
//     const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
    
//     let decrypted = decipher.update(encryptedText);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
    
//     return JSON.parse(decrypted.toString());
//   } catch (err) {
//     console.error("Old decryption error:", err);
//     throw new Error("Old format decryption failed");
//   }
// };

// /**
//  * Decrypt data from new format (AES-256-GCM)
//  * @param {string} encryptedData - Data in format "v1:iv:encrypted:tag" (base64)
//  * @returns {*} - Decrypted and parsed data
//  */
// const decryptDataNew = (encryptedData) => {
//   try {
//     const parts = encryptedData.split(":");
//     if (parts.length !== 4 || parts[0] !== 'v1') {
//       throw new Error("Invalid new encrypted data format");
//     }

//     const iv = Buffer.from(parts[1], "base64");
//     const encrypted = Buffer.from(parts[2], "base64");
//     const tag = Buffer.from(parts[3], "base64");
    
//     const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
//     decipher.setAuthTag(tag);
    
//     let decrypted = decipher.update(encrypted);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
    
//     return JSON.parse(decrypted.toString());
//   } catch (err) {
//     console.error("New decryption error:", err);
//     throw new Error("New format decryption failed");
//   }
// };

// /**
//  * Decrypt data with automatic format detection
//  * @param {string} encryptedData - Encrypted data string
//  * @returns {*} - Decrypted and parsed data
//  */
// const decryptData = (encryptedData) => {
//   try {
//     if (isOldFormat(encryptedData)) {
//       console.log("🔍 Decrypting old format data");
//       return decryptDataOld(encryptedData);
//     } else {
//       console.log("🔍 Decrypting new format data");
//       return decryptDataNew(encryptedData);
//     }
//   } catch (err) {
//     console.error("Decryption error:", err);
//     throw new Error("Decryption failed");
//   }
// };

// /**
//  * Create user-specific encryption key (for future use)
//  * @param {string} userId - User ID
//  * @returns {string} - User-specific key
//  */
// const createUserKey = (userId) => {
//   // This is a placeholder for future user-specific encryption
//   // Currently returns the global key for backward compatibility
//   return ENCRYPTION_KEY;
// };

// module.exports = {
//   encryptData,
//   decryptData,
//   createUserKey,
//   isOldFormat // Export for testing purposes
// };






// // FILE: utils/encrypt.js
// // CHAIN POSITION: 1/11

// // DEPENDENCIES: None (foundation file)
// // EXPORTS: encryptData, decryptData, createUserKey (new format only)

// const crypto = require("crypto");

// // Ensure dotenv is loaded (in case it's not loaded in main app)
// if (!process.env.ENCRYPTION_SECRET) {
//   try {
//     require('dotenv').config();
//   } catch (err) {
//     // dotenv might not be installed, that's okay if env vars are set another way
//   }
// }

// // Fix environment variable mismatch: use ENCRYPTION_SECRET (not ENCRYPTION_KEY)
// const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET;
// const IV_LENGTH = 16; // AES IV size
// const TAG_LENGTH = 16; // GCM authentication tag length

// // Validate encryption key exists
// if (!ENCRYPTION_KEY) {
//   console.error("Available environment variables:", Object.keys(process.env).filter(k => k.includes('ENCRYPT')));
//   console.error("Current working directory:", process.cwd());
//   console.error("Looking for .env file...");
//   throw new Error("ENCRYPTION_SECRET environment variable is required. Please check your .env file and ensure dotenv is loaded in your main app file.");
// }

// // Validate key length (must be 32 bytes for AES-256)
// if (ENCRYPTION_KEY.length !== 64) { // 64 hex chars = 32 bytes
//   console.error("ENCRYPTION_SECRET length:", ENCRYPTION_KEY.length);
//   throw new Error("ENCRYPTION_SECRET must be 64 characters (32 bytes in hex)");
// }

// // Convert hex string to buffer
// const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

// /**
//  * Encrypt data using AES-256-GCM (new format only)
//  * @param {*} data - Data to encrypt (will be JSON stringified)
//  * @returns {string} - Encrypted data in format: "v1:iv:encrypted:tag" (base64)
//  */
// const encryptData = (data) => {
//   try {
//     const iv = crypto.randomBytes(IV_LENGTH);
//     const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
    
//     const plaintext = typeof data === "string" ? data : JSON.stringify(data);
//     let encrypted = cipher.update(plaintext, 'utf8');
//     encrypted = Buffer.concat([encrypted, cipher.final()]);
    
//     const tag = cipher.getAuthTag();
    
//     // New format: v1:iv:encrypted:tag (all base64 encoded)
//     return `v1:${iv.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`;
//   } catch (err) {
//     console.error("Encryption error:", err);
//     throw new Error("Encryption failed");
//   }
// };

// /**
//  * Decrypt data from new format (AES-256-GCM)
//  * @param {string} encryptedData - Data in format "v1:iv:encrypted:tag" (base64)
//  * @returns {*} - Decrypted and parsed data
//  */
// const decryptData = (encryptedData) => {
//   try {
//     const parts = encryptedData.split(":");
//     if (parts.length !== 4 || parts[0] !== 'v1') {
//       throw new Error("Invalid encrypted data format. Expected format: v1:iv:encrypted:tag");
//     }

//     const iv = Buffer.from(parts[1], "base64");
//     const encrypted = Buffer.from(parts[2], "base64");
//     const tag = Buffer.from(parts[3], "base64");
    
//     const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
//     decipher.setAuthTag(tag);
    
//     let decrypted = decipher.update(encrypted);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
    
//     return JSON.parse(decrypted.toString());
//   } catch (err) {
//     console.error("Decryption error:", err);
//     throw new Error("Decryption failed - data may be corrupted or in old format");
//   }
// };

// /**
//  * Create user-specific encryption key (for future use)
//  * @param {string} userId - User ID
//  * @returns {string} - User-specific key
//  */
// const createUserKey = (userId) => {
//   // This is a placeholder for future user-specific encryption
//   // Currently returns the global key for backward compatibility
//   return ENCRYPTION_KEY;
// };

// module.exports = {
//   encryptData,
//   decryptData,
//   createUserKey
// };




// FILE: utils/encrypt.js
// CHAIN POSITION: 1/11 (UPDATED)

// DEPENDENCIES: None
// EXPORTS: Enhanced encryption functions with better error handling

const crypto = require("crypto");

// Ensure dotenv is loaded (in case it's not loaded in main app)
if (!process.env.ENCRYPTION_SECRET) {
  try {
    require('dotenv').config();
  } catch (err) {
    // dotenv might not be installed, that's okay if env vars are set another way
  }
}

// Fix environment variable mismatch: use ENCRYPTION_SECRET (not ENCRYPTION_KEY)
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET;
const IV_LENGTH = 16; // AES IV size
const TAG_LENGTH = 16; // GCM authentication tag length

// Validate encryption key exists
if (!ENCRYPTION_KEY) {
  console.error("Available environment variables:", Object.keys(process.env).filter(k => k.includes('ENCRYPT')));
  console.error("Current working directory:", process.cwd());
  console.error("Looking for .env file...");
  throw new Error("ENCRYPTION_SECRET environment variable is required. Please check your .env file and ensure dotenv is loaded in your main app file.");
}

// Validate key length (must be 32 bytes for AES-256)
if (ENCRYPTION_KEY.length !== 64) { // 64 hex chars = 32 bytes
  console.error("ENCRYPTION_SECRET length:", ENCRYPTION_KEY.length);
  throw new Error("ENCRYPTION_SECRET must be 64 characters (32 bytes in hex)");
}

// Convert hex string to buffer
const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

/**
 * Encrypt data using AES-256-GCM (new format only)
 * @param {*} data - Data to encrypt (will be JSON stringified)
 * @returns {string} - Encrypted data in format: "v1:iv:encrypted:tag" (base64)
 */
const encryptData = (data) => {
  try {
    // Handle null/undefined data
    if (data === null || data === undefined) {
      throw new Error("Cannot encrypt null or undefined data");
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
    
    const plaintext = typeof data === "string" ? data : JSON.stringify(data);
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    // New format: v1:iv:encrypted:tag (all base64 encoded)
    return `v1:${iv.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`;
  } catch (err) {
    console.error("Encryption error:", err);
    throw new Error("Encryption failed: " + err.message);
  }
};

/**
 * Decrypt data with enhanced error handling
 * @param {string} encryptedData - Data to decrypt
 * @returns {*} - Decrypted and parsed data
 */
const decryptData = (encryptedData) => {
  try {
    // Handle null/undefined/empty data
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error("Invalid encrypted data: data is null, undefined, or not a string");
    }

    // Check if it's new format (v1:iv:encrypted:tag)
    if (encryptedData.startsWith('v1:')) {
      return decryptNewFormat(encryptedData);
    }
    
    // If it doesn't start with v1:, it might be old format or corrupted
    // For now, throw an error since we don't have old format data
    throw new Error("Unrecognized encryption format. Expected format: v1:iv:encrypted:tag");
    
  } catch (err) {
    console.error("Decryption error:", err);
    throw new Error("Decryption failed: " + err.message);
  }
};

/**
 * Decrypt data from new format (AES-256-GCM)
 * @param {string} encryptedData - Data in format "v1:iv:encrypted:tag" (base64)
 * @returns {*} - Decrypted and parsed data
 */
const decryptNewFormat = (encryptedData) => {
  const parts = encryptedData.split(":");
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error("Invalid encrypted data format. Expected format: v1:iv:encrypted:tag");
  }

  const iv = Buffer.from(parts[1], "base64");
  const encrypted = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return JSON.parse(decrypted.toString());
};

/**
 * Check if data is encrypted in new format
 * @param {string} data - Data to check
 * @returns {boolean} - True if new format
 */
const isNewFormat = (data) => {
  return data && typeof data === 'string' && data.startsWith('v1:');
};

/**
 * Create user-specific encryption key (for future use)
 * @param {string} userId - User ID
 * @returns {string} - User-specific key
 */
const createUserKey = (userId) => {
  // This is a placeholder for future user-specific encryption
  // Currently returns the global key for backward compatibility
  return ENCRYPTION_KEY;
};

module.exports = {
  encryptData,
  decryptData,
  createUserKey,
  isNewFormat
};

// TESTING: 
// 1. Test encryption/decryption with valid data
// 2. Test error handling with null/undefined data
// 3. Test error handling with corrupted data
// 4. Test format detection