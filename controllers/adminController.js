const Section = require("../models/Section");
const Table = require("../models/Table");
const User = require("../models/User");
const UserTableData = require("../models/UserTableData");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");




// Admin Login
const adminUsername = process.env.ADMIN_USERNAME;
const plainPassword = process.env.ADMIN_PASSWORD;

// Admin Login

// Admin Login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (username === adminUsername) {
      const isMatch = await bcrypt.compare(password, plainPassword);

      if (isMatch) {
        req.session.user = {
          id: "admin",
          username: adminUsername,
          role: "admin",           // Set role as admin
          lastAccess: Date.now(),
        };
        req.session.isAdmin = true;
        await req.session.save();  // Save the session
        req.flash("success", "Welcome Admin 😊");
        return res.redirect("/admin/dashboard");
      }
    }

    console.log("❌ Invalid Admin Credentials");
    req.flash("error", "Invalid Username or Password ❌");
    res.redirect("/admin");

  } catch (err) {
    console.error("❌ Error in Admin Login:", err);
    res.status(500).send("Error logging in");
  }
};

// exports.login = async (req, res) => {
//   const { username, password } = req.body;

//   if (username === adminUsername) {
//     const isMatch = await bcrypt.compare(password, plainPassword);

//     if (isMatch) {
//       req.session.isAdmin = true;
//       req.session.lastAccess = Date.now();
//       req.flash("success", "Welcome Admin 😊");
//       res.redirect("/admin/dashboard");
//     } else {
//       console.log("❌ Wrong Password:", password);
//       req.flash("error", "Invalid Username or Password ❌");
//       res.redirect("/admin");
//     }
//   } else {
//     console.log("❌ Wrong Username:", username);
//     req.flash("error", "Invalid Username or Password ❌");
//     res.redirect("/admin");
//   }
// };


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

  try {
    const { columns, data } = req.body;
    const tableId = req.params.id;
    console.log("datas for update table!", JSON.stringify(tableId, null, 2));

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



exports.getAllUsers = async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find().lean();

    // Render the users in a view, adjust the view name and path as necessary
    res.render("admin/view-users", {
      users,
      layout: "layout",
      headerType: "admin-header",
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    req.flash("error", "Failed to fetch users ❌");
    res.status(500).send("Server Error");
  }
};

exports.viewUserSection = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const sections = await Section.find().lean();
    res.render("admin/view-user-section", {
      user,
      sections,
      layout: "layout",
      headerType: "admin-header",
    });
  } catch (err) {

  }
}



exports.viewUserTable = async (req, res) => {
  console.log("🔍 Session Data:", req.session);
  console.log("📌 Section ID:", req.params.id);

  try {
    const sectionId = req.params.sectionId;
    const userId = req.params.userId;

    // Validate and convert to ObjectId
    if (!mongoose.Types.ObjectId.isValid(sectionId) || !mongoose.Types.ObjectId.isValid(userId)) {
      req.flash("error", "Invalid Section or User ID");
      return res.redirect("/admin/dashboard");
    }

    const section = await Section.findById(sectionId);
    console.log("reciveddddd: id: ", section);
    if (!section) {
      req.flash("error", "Section Not Found");
      return res.redirect("/admin/dashboard");
    }

    const user = await User.findById(userId);
    if (!user) {
      req.flash("error", "User Not Found");
      return res.redirect("/admin/dashboard");
    }

    // Ensure session user exists
    if (!req.session.isAdmin) {
      req.flash("error", "Session expired. Please log in again.");
      return res.redirect("/admin/login");
    }

    const isAdmin = req.session.isAdmin;  // Check if user is admin
    console.log("👤 Admin id:", isAdmin);

    let userTableData = await UserTableData.findOne({ section: section._id, user: userId }).populate("user").lean();
    let tables = [];

    if (userTableData) {
      console.log("✅ User has saved table data:", userTableData);
      formatTableData(userTableData, isAdmin);
      tables.push(userTableData);
    } else {
      console.log("🔄 Fetching default admin table...");
      const adminTable = await Table.findOne({ section: section._id }).lean();
      if (adminTable) {
        formatTableData(adminTable, isAdmin);
        tables.push(adminTable);
      }
    }

    if (!tables.length) {
      req.flash("error", "No tables available for this section.");
      return res.redirect("/admin/dashboard");
    }

    console.log("📝 Processed table:", JSON.stringify(tables, null, 2));

    res.render("admin/grading-panel", {
      section,
      user,
      tables,
      layout: "layout",
      headerType: "admin-header",
    });

  } catch (err) {
    console.error("❌ Error in viewSection:", err);
    req.flash("error", "Something went wrong");
    res.redirect("/admin/dashboard");
  }
};

/**
 * 📝 Format table data:
 * - Ensure only 'max mark' is editable for admin.
 */
const formatTableData = (table, isAdmin) => {
  table.columns = table.columns.map(col => ({
    ...col,
    isEditable: isAdmin && ["MARK", "MAX MARK"].includes(col.name),  // Editable for admin
  }));

  table.data.forEach(row => {
    row.columns = row.columns.map(col => ({
      name: col.columnName || "Unnamed Column",
      value: col.value || "",
      type: col.type || "text",
      isEditable: isAdmin && ["MARK", "MAX MARK"].includes(col.columnName),  // Editable for admin
    }));
  });
}


// add grade for user
exports.addGrade = async (req, res) => {
  const { sectionId, data } = req.body;
  const { userId, id } = req.params;
  try {
    // Validate Object IDs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(sectionId) || !mongoose.Types.ObjectId.isValid(id)) {
      req.flash("error", "Invalid User, Section, or Table ID");
      return res.redirect("/admin/dashboard");
    }
    // Check if user and section exist
    const user = await User.findById(userId);
    const section = await Section.findById(sectionId);
    console.log("user:::", user);
    console.log("section:::", section);
    
    if (!user) {
      req.flash("error", "User Not Found");
      return res.redirect("/admin/dashboard");
    }

    const userTableData = await UserTableData.findOne({
      _id: id,
      user: user,
      section: section
    }).populate("section");
    console.log("userTable Data:::", userTableData);
    if (!userTableData) {
      req.flash("error", "User table data not found ❌");
      console.log("User table data not found")
      return res.redirect(`/admin/user/${userId}/section/${sectionId}`);
    }

    let totalMarks = 0, maxMarks = 0;

    // Update only MARK and MAX MARK values
    data.forEach((row, rowIndex) => {
      row.columns.forEach(col => {
        if (["MARK", "MAX MARK"].includes(col.name)) {
          const userRow = userTableData.data[rowIndex];
          const userCol = userRow.columns.find(c => c.columnName === col.name);

          if (userCol) {
            userCol.value = col.value;

            if (col.name === "MARK") {
              totalMarks += parseInt(col.value) || 0;
            }
            if (col.name === "MAX MARK") {
              maxMarks += parseInt(col.value) || 0;
            }
          }
        }
      });
    });

    // Update percentage
    userTableData.totalMarks = totalMarks;
    userTableData.maxMarks = maxMarks;
    userTableData.percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;

    await userTableData.save();

    req.flash("success", "Marks updated successfully ✅");
    res.redirect(`/admin/user/${userId}/section/${sectionId}`);
  } catch (error) {
    console.error("❌ Error:", error);
    req.flash("error", "Failed to update marks ❌");
    res.redirect(`/admin/user/${userId}/section/${sectionId} || "fallback-section"}`);
  }
};
