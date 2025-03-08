const fs = require("fs");
const bcrypt = require("bcryptjs");
require("dotenv").config(); // Load .env File

async function autoHashPassword() {
  const plainPassword = process.env.ADMIN_PASSWORD;

  // Check Already Hashed Password 🔍
  if (plainPassword.startsWith("$2b$")) {
    console.log("✅ Password Already Hashed");
    return;
  }

  console.log("🔑 Hashing Password...");

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Update .env File 📝
  let envFile = fs.readFileSync(".env", "utf-8");
  envFile = envFile.replace(`ADMIN_PASSWORD=${plainPassword}`, `ADMIN_PASSWORD=${hashedPassword}`);
  fs.writeFileSync(".env", envFile);
  console.log("🔥 Password Saved Automatically in .env");
}

module.exports = autoHashPassword;
