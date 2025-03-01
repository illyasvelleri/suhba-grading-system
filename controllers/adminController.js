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
        res.render("admin/view-section", { section: section.toObject() , tables: tables.map(table => table.toObject())});
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
        console.log(section);
        if (!section) {
            return res.status(404).send('Section Not Found');
        }

        let columns = [];
        for (let i = 0; i < columnsCount; i++) {
            columns.push({
                name: req.body[`columnName${i}`],
                type: req.body[`columnType${i}`],
                isEditable: req.body[`isEditable${i}`] === 'on' ? true : false
            });
        }

        const table = new Table({
            section: sectionId,
            tableName,
            columns,
            rowsCount
        });

        for (let i = 1; i <= rowsCount; i++) {
            table.data.push({
                rowNumber: i,
                columns: columns.map((col) => ({
                    columnName: col.name,
                    value: ''
                }))
            });
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
        const table = await Table.findById(req.params.id);
        if (!table) {
            return res.status(404).send("Table Not Found");
        }
        res.render("admin/table", { table: table.toObject() }); // Pass Table Data
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
};
