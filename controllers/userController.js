const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Section = require('../models/Section');
const UserTableData = require('../models/UserTableData');
const Table = require('../models/Table');
const mongoose = require("mongoose");
const router = require('../routes/adminRoutes');

exports.register = async (req, res) => {
    console.log("🔍 Request Body:", req.body); // Debugging log
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        req.session.user = user;
        res.render("user/login");
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating user');
    }
};

// User Login
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            console.log("❌ User not found:", username);
            req.flash("error", "Invalid Username or Password ❌");
            return res.redirect("/login");
        }

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Incorrect Password for:", username);
            req.flash("error", "Invalid Username or Password ❌");
            return res.redirect("/login");
        }

        // Set session for user
        req.session.user = {
            id: user._id.toString(),
            username: user.username,
            lastAccess: Date.now(),
        };
        await req.session.save();
        console.log("Session Data:", req.session);

        console.log("✅ User Logged In:", username);
        req.flash("success", "Welcome " + user.username + " 😊");
        res.redirect("/dashboard"); // Redirect to user dashboard

    } catch (err) {
        console.error(err);
        res.status(500).send("Error logging in");
    }
};

// User Logout
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
};


// Display Dashboard
exports.dashboard = async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "Please login first ❌");
        return res.redirect("/login");
    }
    // Fetch user data
    const sections = await Section.find().lean();
    res.render("user/dashboard", { user: req.session.user, sections, layout: 'layout', headerType: 'user-header' });
};




// exports.viewSection = async (req, res) => {
//     console.log("Session Data:", req.session);
//     console.log("body:", req.params.id);

//     try {

//         const section = await Section.findById(req.params.id);
//         if (!section) {
//             req.flash("error", "Section Not Found");
//             return res.redirect("/dashboard");
//         }

//         const userId = req.session.user.id; // User ID from session
//         console.log("useriddddddddddddd:", userId);
//         console.log("🔍 Checking for user-saved table...");

//         let userTableData = await UserTableData.findOne({ section: section._id, user: userId }).populate("user").lean();

//         if (userTableData) {
//             console.log("✅ User has a saved table. Merging with admin updates...:", userTableData);

//             // Ensure columns have `isEditable`
//             userTableData.columns = userTableData.columns.map(col => ({
//                 ...col,
//                 isEditable: col.isEditable !== undefined ? col.isEditable : false
//             }));

//             // Process each row's columns
//             userTableData.data.forEach(row => {
//                 row.columns = row.columns.map((col, index) => ({
//                     name: userTableData.columns[index]?.name || `Column ${index + 1}`,
//                     value: col.value || "",
//                     type: userTableData.columns[index]?.type || "text",
//                     isEditable: userTableData.columns[index]?.isEditable || false
//                 }));
//             });

//             console.log("✅ User Table processed successfully.");

//             return res.render("user/view-section", {
//                 section,
//                 user: req.session.user,
//                 tables: [userTableData],
//                 user: req.session.user,
//                 layout: "layout",
//                 headerType: "user-header",
//             });
//         }

//         console.log("❌ No saved table found. Fetching admin-created tables...");
//         let tables = await Table.find({ section: section._id }).populate("section").lean();

//         if (!tables.length) {
//             console.log("⚠️ No tables available in this section.");
//             req.flash("error", "No tables available for this section.");
//             return res.redirect("/dashboard");
//         }

//         console.log("✅ Admin tables found. Processing...");

//         // ✅ Ensure each column has `isEditable` and sync it with `data.columns`
//         tables.forEach(table => {
//             table.columns = table.columns.map(col => ({
//                 ...col,
//                 isEditable: col.isEditable !== undefined ? col.isEditable : false // Default to false
//             }));

//             table.data.forEach(row => {
//                 row.columns = row.columns.map((col, index) => ({
//                     name: table.columns[index]?.name || `Column ${index + 1}`, // Column name
//                     value: col.value || "", // Actual cell value
//                     type: table.columns[index]?.type || "text",
//                     isEditable: table.columns[index]?.isEditable || false
//                 }));
//             });
//         });
//         console.log("✅ Tables processed successfully.");
//         if (tables.length) {
//             tables.forEach((table, index) => {
//                 console.log(`✅ Table ${index + 1} Columns:`, table.columns.map(col => col.name));
//             });
//         }
//         console.log("User Data passing:", req.session.user);
//         console.log("Tables Data:", tables);
//         console.log("Table Paths:", tables.map(table => `/table/save/${table._id}`));

//         res.render("user/view-section", {
//             section,
//             user: req.session.user,
//             tables,
//             layout: "layout",
//             headerType: "user-header",

//         });


//     } catch (err) {
//         console.error("❌ Error in viewSection:", err);
//         req.flash("error", "Something went wrong");
//         res.redirect("/dashboard");
//     }
// };

exports.viewSection = async (req, res) => {
    console.log("Session Data:", req.session);
    console.log("body:", req.params.id);

    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            req.flash("error", "Section Not Found");
            return res.redirect("/dashboard");
        }

        const userId = req.session.user.id;
        console.log("useriddddddddddddd:", userId);

        let userTableData = await UserTableData.findOne({ section: section._id, user: userId }).populate("user").lean();

        let tables = [];

        if (userTableData) {
            console.log("✅ User has a saved table:", userTableData);
            console.log("🔄 userTable... :", JSON.stringify(userTableData, null, 2));

            let adminTable = await Table.findById(section._id).populate("section").lean();

            if (adminTable) {
                userTableData = mergeUserTableWithAdmin(userTableData, adminTable);
            }

            userTableData.columns = userTableData.columns.map(col => ({
                ...col,
                isEditable: col.isEditable !== undefined ? col.isEditable : false
            }));

            userTableData.data.forEach(row => {
                row.columns = row.columns.map((col, index) => ({
                    name: userTableData.columns[index]?.name || `Column ${index + 1}`,
                    value: col.value || "",
                    type: userTableData.columns[index]?.type || "text",
                    isEditable: col.isEditable !== undefined ? col.isEditable : userTableData.columns[index]?.isEditable || false
                }));
            });

            tables.push(userTableData);
        }

        console.log("❌ Checking for new tables...");
        let newTables = await checkNewTables(userId, section._id);

        newTables.forEach(table => {
            table.columns = table.columns.map(col => ({
                ...col,
                isEditable: col.isEditable !== undefined ? col.isEditable : false
            }));

            table.data.forEach(row => {
                row.columns = row.columns.map((col, index) => ({
                    name: table.columns[index]?.name || `Column ${index + 1}`,
                    value: col.value || "",
                    type: table.columns[index]?.type || "text",
                    isEditable: col.isEditable !== undefined ? col.isEditable : userTableData.columns[index]?.isEditable || false
                }));
            });

            tables.push(table);
        });

        if (!tables.length) {
            console.log("⚠️ No tables found. Redirecting...");
            req.flash("error", "No tables available for this section.");
            return res.redirect("/dashboard");
        }

        console.log("✅ Tables processed successfully:", tables.map(t => t.name));
        console.log("Table Data:", JSON.stringify(tables, null, 2));
        res.render("user/view-section", {
            section,
            user: req.session.user,
            tables,  // 🔥 New tables are merged here!
            layout: "layout",
            headerType: "user-header",
        });

    } catch (err) {
        console.error("❌ Error in viewSection:", err);
        req.flash("error", "Something went wrong");
        res.redirect("/dashboard");
    }
};

const mergeUserTableWithAdmin = (userTableData, adminTable) => {
    let updatedTable = { ...userTableData };

    let adminColumns = adminTable.columns.map(col => col.name);
    let userColumns = userTableData.columns.map(col => col.name);

    // Add new admin columns to user's saved table
    adminColumns.forEach(colName => {
        if (!userColumns.includes(colName)) {
            updatedTable.columns.push({ name: colName, type: "text", isEditable: false });
        }
    });

    // Merge admin's new rows with user's saved rows
    let updatedRows = [];
    let userRowsById = new Map(userTableData.data.map(row => [row.id, row]));

    adminTable.data.forEach(adminRow => {
        if (userRowsById.has(adminRow.id)) {
            updatedRows.push(userRowsById.get(adminRow.id)); // Keep user's saved version
        } else {
            updatedRows.push(adminRow); // Add new admin row
        }
    });

    updatedTable.data = updatedRows;

    console.log("🔄 Merging User Table With Admin Table:", JSON.stringify(updatedTable, null, 2));

    return updatedTable;
};


const checkNewTables = async (userId, sectionId) => {
    try {
        // Fetch all tables in the section
        const allTables = await Table.find({ section: sectionId }).lean();

        // Fetch user's saved table (if exists)
        const userSavedTable = await UserTableData.findOne({ user: userId, section: sectionId }).lean();

        // If user has not saved any table yet, return all tables as new
        if (!userSavedTable) {
            return allTables; // All tables are new
        }

        // Get the saved table's ID
        const savedTableId = userSavedTable.table.toString(); // Convert to string for comparison

        // Filter out tables that the user has not saved
        const newTables = allTables.filter(table => table._id.toString() !== savedTableId);

        return newTables; // Return list of new tables
    } catch (error) {
        console.error("❌ Error checking new tables:", error);
        return [];
    }
};


exports.saveTable = async (req, res) => {
    console.log("Received Data:");
    const data = req.body.columns;
    console.log("colums data befor save", JSON.stringify(data, null, 2));
    console.log("Columns Data:", req.body.columns);


    try {
        const { id } = req.params; // Corrected table ID access
        const { tableDescription, data, sectionId } = req.body;
        console.log("User ID:", req.session.user.id); // ✅ Log the user ID
        if (!req.session.user) {
            req.flash("error", "Please login first ❌");
            return res.redirect("/login");
        }
        // ✅ Fetch the table from the database
        const table = await Table.findById(id);
        if (!table) {
            return res.status(404).json({ error: "Table not found." });
        }
        table.columns = table.columns || [];
        // **Extract unique column structure**
        const columns = data[0]?.columns.map((col) => ({
            name: col.name,
            type: col.type || "text",
            isEditable: col.isEditable === "true", // ✅ Convert "true"/"false" to boolean
        })) || [];

        // Format and structure the data
        const formattedData = data.map((row, rowIndex) => ({
            rowNumber: rowIndex + 1,
            columns: row.columns.map((col, colIndex) => ({
                columnName: col.name,
                value: col.value,
                type: col.type,
                isEditable: table.columns[colIndex]?.isEditable ?? true, // ✅ Ensure boolean
            })),
        }));

        // Calculate total marks and percentage
        let totalMarks = 0, maxMarks = 0;
        formattedData.forEach(row => {
            row.columns.forEach(col => {
                if (col.type === "mark") totalMarks += parseInt(col.value || 0);
                if (col.type === "max-mark") maxMarks += parseInt(col.value || 0);
            });
        });

        const percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;

        // Find the existing table or create a new one
        let userTableData = await UserTableData.findOne({ table: id });
        console.log("Saving Data:", JSON.stringify(req.body, null, 2));


        if (!userTableData) {
            userTableData = new UserTableData({
                user: req.session.user.id, // Ensure user is logged in
                section: sectionId,
                table: id,
                tableDescription,
                rowsCount: formattedData.length,
                columns,
                data: formattedData,
                totalMarks,
                maxMarks,
                percentage
            });
        } else {
            userTableData.tableDescription = tableDescription;
            userTableData.rowsCount = formattedData.length;
            userTableData.columns = columns;
            userTableData.data = formattedData;
            userTableData.totalMarks = totalMarks;
            userTableData.maxMarks = maxMarks;
            userTableData.percentage = percentage;
        }

        await userTableData.save();
        req.flash("success", "Table data updated successfully ✅");
        console.log("saved susss");
        res.redirect(`/view-section/${sectionId}`); // Fixed redirect path
    } catch (error) {
        console.error("❌ Error:", error);
        req.flash("error", "Failed to update table data ❌");
        res.redirect(`/view-section/${sectionId}`);
    }
};



// Show Profile Page
exports.profile = async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "Please login first ❌");
        return res.redirect("/login");
    }

    try {
        const user = await User.findById(req.session.user.id).lean();
        res.render("user/profile", { user, layout: 'layout', headerType: 'user-header' });
    } catch (err) {
        console.error("Error fetching user profile:", err);
        req.flash("error", "Something went wrong ❌");
        res.redirect("/dashboard");
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "Please login first ❌");
        return res.redirect("/login");
    }

    try {
        const { username, category, studentCount } = req.body;

        // Update user details
        await User.findByIdAndUpdate(req.session.user.id, {
            username,
            category,
            studentCount
        });

        // Update session with new username
        req.session.user.username = username;

        req.flash("success", "Profile updated successfully ✅");
        res.redirect("/profile");
    } catch (err) {
        console.error("Error updating profile:", err);
        req.flash("error", "Failed to update profile ❌");
        res.redirect("/profile");
    }
};