const Section = require("../models/Section");
const Table = require("../models/Table");
const bcrypt = require("bcryptjs");

// Admin Login
const adminUsername = process.env.ADMIN_USERNAME;
const plainPassword = process.env.ADMIN_PASSWORD;

// Admin Login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (username === adminUsername) {
    const isMatch = await bcrypt.compare(password, plainPassword);

    if (isMatch) {
      req.session.isAdmin = true;
      req.session.lastAccess = Date.now();
      req.flash("success", "Welcome Admin 😊");
      res.redirect("/admin/dashboard");
    } else {
      console.log("❌ Wrong Password:", password);
      req.flash("error", "Invalid Username or Password ❌");
      res.redirect("/admin");
    }
  } else {
    console.log("❌ Wrong Username:", username);
    req.flash("error", "Invalid Username or Password ❌");
    res.redirect("/admin");
  }
};


// Admin Logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.redirect("/admin/dashboard"); // If error, stay on dashboard
    }
    res.redirect("/admin"); // Redirect to login after successful logout
  });
};




// Display Dashboard
exports.dashboard = async (req, res) => {
  const sections = await Section.find().lean();
  res.render("admin/dashboard", { sections, layout: 'layout', headerType: 'admin-header' });
};

// Create Section
exports.createSection = async (req, res) => {
  const { number, name, sectionCategory } = req.body;
  await new Section({ number, name, sectionCategory }).save();
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
    res.render("admin/view-section", { section: section.toObject(), tables: tables.map(table => table.toObject()), layout: 'layout', headerType: 'admin-header' });
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
          type: col.type, // Add the column type to each column
          isEditable: col.isEditable
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
    res.render("admin/table", { table: table.toObject(), isAdmin: isAdmin, layout: 'layout', headerType: 'admin-header' }); // Pass Table Data
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
  console.log(req.body);
  try {
    const { columns, data } = req.body;
    const tableId = req.params.id;


    // Convert req.body values to arrays if not already
    if (!Array.isArray(req.body.totalMarks)) {
      req.body.totalMarks = [req.body.totalMarks];
    }
    if (!Array.isArray(req.body.maxMarks)) {
      req.body.maxMarks = [req.body.maxMarks];
    }
    if (!Array.isArray(req.body.percentage)) {
      req.body.percentage = [req.body.percentage];
    }

    // Convert all values to Numbers
    req.body.totalMarks = req.body.totalMarks.filter(m => m !== "").map(Number);
    req.body.maxMarks = req.body.maxMarks.filter(m => m !== "").map(Number);
    req.body.percentage = req.body.percentage.filter(m => m !== "").map(Number);



    // Find Table
    const table = await Table.findById(tableId);
    if (!table) {
      req.flash("error", "Table Not Found");
      return res.redirect("/admin/view-section");
    }
    console.log("columns: ", columns);
    // ✅ Check Columns Undefined Problem
    if (!columns) {
      req.flash("error", "Columns Data Missing 😔");
      return res.redirect(`/admin/table/edit/${tableId}`);
    }

    // Update Columns
    table.columns = columns.map((col, index) => ({
      name: col.name,
      type: col.type || "text",
      isEditable: table.columns[index]?.isEditable ?? true,
    }));

    // ✅ Check Data Undefined Problem
    if (Array.isArray(data)) {
      table.data = data.map((row, rowIndex) => ({
        rowNumber: row.rowNumber,
        columns: row.columns.map((col, colIndex) => ({
          columnName: table.columns[colIndex]?.name,
          value: col.value || "",
          type: col.type || "text",
          isEditable: table.columns[colIndex]?.isEditable ?? true,
        })),
      }));
    }

    // 🔥 Calculate Total Marks
    let totalMarks = 0;
    let maxMarks = 0;

    table.data.forEach((row) => {
      let rowTotal = 0;
      let rowMax = 0;

      row.columns.forEach((col) => {
        if (col.type === "mark") {
          rowTotal += parseFloat(col.value) || 0;
        }
        if (col.type === "max-mark") {
          rowMax += parseFloat(col.value) || 0;
        }
      });

      totalMarks += rowTotal; // ✅ Add to Total
      maxMarks += rowMax; // ✅ Add to Max Marks
    });

    table.totalMarks = totalMarks; // ✅ Direct Assign
    table.maxMarks = maxMarks; // ✅ Direct Assign

    // ✅ Percentage Calculation
    table.percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;


    await table.save();

    req.flash("success", "Table Updated Successfully 🔥");
    res.redirect(`/admin/table/edit/${tableId}`);
  } catch (err) {
    console.log(err);
    req.flash("error", "Something Went Wrong 😔");
    res.redirect(`/admin/table/edit/${req.params.id}`);
  }
};
