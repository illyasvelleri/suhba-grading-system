const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },  // Required Username
    password: { type: String, required: true },  // Required Password
    category: {
        type: String,
        enum: ["below20", "below50", "above50"]
    },
    studentCount: { type: Number, default: 0 }, // New Field
    role: { type: String, enum: ["admin", "user"], default: "user" }
});

module.exports = mongoose.model("User", userSchema);
