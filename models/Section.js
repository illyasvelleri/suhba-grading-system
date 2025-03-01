const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    number: { type: Number, required: true }
});

module.exports = mongoose.model("Section", sectionSchema);
