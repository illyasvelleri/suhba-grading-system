const mongoose = require("mongoose");

const UserTableDataSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    data: [
        {
            rowNumber: Number,
            columns: [
                {
                    columnName: String,
                    value: String,
                    type: String,
                },
            ],
        },
    ],
});

module.exports = mongoose.model("UserTableData", UserTableDataSchema);
