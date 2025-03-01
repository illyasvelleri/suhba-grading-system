const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    section: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    },
    tableName: {
        type: String,
        required: true
    },
    columns: [
        {
            name: {
                type: String,
                required: true
            },
            type: {
                type: String,
                enum: ['text', 'radio', 'marks'],
                required: true
            },
            isEditable: {
                type: Boolean,
                default: false
            }
        }
    ],
    rowsCount: {
        type: Number,
        required: true
    },
    data: [
        {
            rowNumber: {
                type: Number
            },
            columns: [
                {
                    columnName: String,
                    value: String
                }
            ]
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
