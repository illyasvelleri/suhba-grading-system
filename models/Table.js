const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
    {
        section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Section",
            required: true,
        },
        tableName: {
            type: String,
            required: true,
        },
        columns: [
            {
                name: {
                    type: String,
                    required: true,
                },
                type: {
                    type: String,
                    enum: ["text", "radio", "marks", "max-marks"], // Column Type
                    required: true,
                },
                isEditable: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
        rowsCount: {
            type: Number,
            required: true,
        },
        data: [
            {
                rowNumber: Number,
                columns: [
                    {
                        columnName: String,
                        value: String, // Editable Value Here
                        type: {
                            type: String,
                            enum: ["text", "radio", "marks", "max-marks"], // Type Store in Data Also
                        },
                    },
                ],
            },
        ],
        totalMarks: {
            type: Number,
            default: 0, // Automatically Calculate Total Marks
        },
        maxMarks: {
            type: Number,
            default: 0, // Automatically Calculate Max Marks
        },
        percentage: {
            type: Number,
            default: 0, // Automatically Calculate Percentage
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Table", tableSchema);
