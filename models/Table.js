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
                    enum: ["text", "radio", "mark", "max-mark"], // Column Type
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
                            enum: ["text", "radio", "mark", "max-mark"], // Type Store in Data Also
                        },
                        isEditable: {
                            type: Boolean
                        },
                    },
                ],
            },
        ],
        totalMarks: {
            type: [Number],
            default: [], // Automatically Calculate Total Marks
        },
        maxMarks: {
            type: [Number],
            default: [], // Automatically Calculate Max Marks
        },
        percentage: {
            type: [Number],
            default: [], // Automatically Calculate Percentage
        },
        tableDescription: {
            type: String,
            default: ""
        },
    },

    { timestamps: true }
);

module.exports = mongoose.model("Table", tableSchema);
