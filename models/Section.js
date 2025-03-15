const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
    number: { type: String, required: true },
    name: { type: String, required: true },
    sectionCategory: {
        type: String,
        enum: ["below-20", "below-50", "above-50"]
    }
});

module.exports = mongoose.model("Section", sectionSchema);
