const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    category: { 
        type: String, 
        enum: ["below20", "below50", "above200"] 
    },
    studentCount: { type: Number, default: 0 }, // New Field
    role: { type: String, enum: ["admin", "user"], default: "user" }
});

module.exports = mongoose.model("User", userSchema);
