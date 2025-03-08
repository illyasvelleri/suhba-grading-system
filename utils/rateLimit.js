const rateLimit = require("express-rate-limit");

// Limit Admin Login Attempts (5 per 15 min)
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutes
  max: 5, // Max 5 Attempts
  message: "❌ Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit User Login Attempts (5 per 15 min)
const userLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutes
  max: 5, // Max 5 Attempts
  message: "❌ Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { adminLoginLimiter, userLoginLimiter };
