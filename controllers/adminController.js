const Section = require("../models/Section");
const Table = require("../models/Table");


// Display Dashboard
exports.dashboard = async (req, res) => {
    const sections = await Section.find().lean();
    res.render("admin/dashboard", { sections });
};

// Create Section
exports.createSection = async (req, res) => {
    const { name, number } = req.body;
    await new Section({ name, number }).save();
    res.redirect("/admin/dashboard");
};

// Delete Section
exports.deleteSection = async (req, res) => {
    await Section.findByIdAndDelete(req.params.id);
    res.redirect("/admin/dashboard");
};

exports.viewSection = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).send("Section Not Found");
        }

        console.log("Section Found:", section);
        const tables = await Table.find({ section: section._id }).populate("section"); // Fetch All Tables Related to Section
        res.render("admin/view-section", { section: section.toObject(), tables: tables.map(table => table.toObject()) });
    } catch (err) {
        console.log("Error:", err);
        res.status(500).send("Server Error");
    }
}


exports.createTable = async (req, res) => {
    try {
        const { sectionId, tableName, columnsCount, rowsCount } = req.body;

        if (!sectionId || sectionId.trim() === "") {
            return res.status(400).json({ message: "Section ID is required" });
        }

        const section = await Section.findById(sectionId);
        if (!section) {
            return res.status(404).send('Section Not Found');
        }

        // Create columns array
        let columns = [];
        for (let i = 0; i < columnsCount; i++) {
            columns.push({
                name: req.body[`columnName${i}`],
                type: req.body[`columnType${i}`],
                isEditable: req.body[`isEditable${i}`] === 'on' ? true : false
            });
        }

        // Create table
        const table = new Table({
            section: sectionId,
            tableName,
            columns,
            rowsCount,
            data: [] // Initialize the data array
        });

        // Populate data array with rows and columns
        for (let i = 1; i <= rowsCount; i++) {
            const row = {
                rowNumber: i,
                columns: columns.map((col) => ({
                    columnName: col.name,
                    value: "", // Initialize with empty value
                    type: col.type // Add the column type to each column
                }))
            };
            table.data.push(row); // Add the row to the data array
        }

        await table.save();
        res.redirect(`/admin/view-section/${sectionId}`);
    } catch (error) {
        console.log(error);
        res.status(500).send('Server Error');
    }
};


exports.deleteTable = async (req, res) => {
    try {
        await Table.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Table Deleted Successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.editTablePage = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id).populate("section");
        if (!table) {
            return res.status(404).send("Table Not Found");
        }
        const isAdmin = req.session.isAdmin; // Check Admin Status
        res.render("admin/table", { table: table.toObject(), isAdmin: isAdmin }); // Pass Table Data
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
};


// exports.updateTable = async (req, res) => {
//     try {
//         const table = await Table.findById(req.params.id);
//         if (!table) {
//             return res.status(404).send("Table Not Found");
//         }

//         // Update table columns
//         table.columns = req.body.columns.map((col) => ({
//             name: col.name,
//             type: col.type,
//             isEditable: col.isEditable === "on",
//         }));

//         // Update table data
//         table.data = req.body.data.map((row) => ({
//             rowNumber: row.rowNumber,
//             columns: row.columns.map((col, index) => ({
//                 columnName: table.columns[index].name,
//                 value: col.value,
//                 type: table.columns[index].type,
//             })),
//         }));

//         await table.save();
//         res.redirect(`/admin/view-section/${table.section}`);
//     } catch (err) {
//         console.log(err);
//         res.status(500).send("Server Error");
//     }
// };
exports.updateTable = async (req, res) => {
    try {
        const { tableId } = req.params.id;
        const { columns, data } = req.body;

        // ✅ Update Columns
        let updatedColumns = columns.map(col => ({
            name: col.name,
            isEditable: col.isEditable === 'on' ? true : false
        }));

        // ✅ Update Data Rows
        let updatedData = data.map((row, rowIndex) => ({
            rowNumber: rowIndex + 1,
            columns: row.columns.map(col => ({
                type: col.type,
                value: col.value || '',
                maxMarks: col.maxMarks || ''
            }))
        }));

        // ✅ Calculate Total Marks & Max Marks
        let totalMarks = 0;
        let maxMarks = 0;

        updatedData.forEach(row => {
            row.columns.forEach(col => {
                if (col.type === 'marks') {
                    totalMarks += Number(col.value) || 0;
                }
                if (col.type === 'maxMarks') {
                    maxMarks += Number(col.value) || 0;
                }
            });
        });

        // ✅ Update Table in MongoDB
        await Table.findByIdAndUpdate(tableId, {
            columns: updatedColumns,
            data: updatedData,
            totalMarks: totalMarks,
            maxMarks: maxMarks,
            percentage: maxMarks > 0 ? (totalMarks / maxMarks * 100).toFixed(2) : 0
        }).populate("Table");

        console.log('Table Updated Successfully');
        res.redirect(`/admin/table/edit/${tableId}`);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
};