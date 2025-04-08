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
// exports.dashboard = async (req, res) => {
//     if (!req.session.user) {
//         req.flash("error", "Please login first ❌");
//         return res.redirect("/login");
//     }
//     // Fetch user data
//     const sections = await Section.find().lean();
//     res.render("user/dashboard", { user: req.session.user, sections, layout: 'layout', headerType: 'user-header' });
// };
// Display Dashboard
exports.dashboard = async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "Please login first ❌");
        return res.redirect("/login");
    }

    try {
        // Fetch the logged-in user
        const user = await User.findById(req.session.user.id).lean();
        if (!user) {
            req.flash("error", "User not found ❌");
            return res.redirect("/login");
        }

        // Fetch sections matching the user's category
        const matchingSections = await Section.find({ sectionCategory: user.category }).lean();

        res.render("user/dashboard", {
            user,
            sections: matchingSections,
            layout: 'layout',
            headerType: 'user-header'
        });
    } catch (error) {
        console.error("Error fetching user or sections:", error);
        req.flash("error", "Failed to load dashboard ❌");
        res.redirect("/login");
    }
};






exports.viewSection = async (req, res) => {
    console.log("🔍 Session Data:", req.session);
    console.log("📌 Section ID:", req.params.id);

    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            req.flash("error", "Section Not Found");
            return res.redirect("/dashboard");
        }

        const userId = req.session.user.id;
        console.log("👤 User ID:", userId);

        let userTableData = await UserTableData.findOne({ section: section._id, user: userId }).populate("user").lean();
        let tables = [];

        // 🟢 If user has a saved table, update with new admin columns/rows
        if (userTableData) {
            console.log("✅ User has a saved table:", userTableData);

            let adminTable = await Table.findById(section._id).populate("section").lean();
            if (adminTable) {
                userTableData = mergeUserTableWithAdmin(userTableData, adminTable);
            }

            formatTableData(userTableData);
            tables.push(userTableData);
        }

        // 🔄 Check for new tables the user hasn't saved yet
        console.log("🔍 Checking for new tables...");

        let newTables = await checkNewTables(userId, section._id)
        newTables.forEach(formatTableData);
        tables.push(...newTables);

        if (!tables.length) {
            console.log("⚠️ No tables found. Redirecting...");
            req.flash("error", "No tables available for this section.");
            return res.redirect("/dashboard");
        }

        console.log("📝processed table:", JSON.stringify(tables, null, 2));

        res.render("user/view-section", {
            section,
            user: req.session.user,
            tables,
            layout: "layout",
            headerType: "user-header",
        });

    } catch (err) {
        console.error("❌ Error in viewSection:", err);
        req.flash("error", "Something went wrong");
        res.redirect("/dashboard");
    }
};

/**
 * 🛠️ Merge user table with admin table:
 * - Adds new admin columns to user's table.
 * - Merges new rows from admin table if not present in user's table.
 */
const mergeUserTableWithAdmin = (userTableData, adminTable) => {
    let updatedTable = { ...userTableData };

    // Get column names as sets for faster lookup
    let adminColumnNames = new Set(adminTable.columns.map(col => col.name));
    let userColumnNames = new Set(userTableData.columns.map(col => col.name));

    // Add missing admin columns to user's table
    adminTable.columns.forEach(col => {
        if (!userColumnNames.has(col.name)) {
            updatedTable.columns.push({ name: col.name, type: col.type || "text", isEditable: false });
        }
    });

    // Merge admin's new rows with user's saved rows
    let userRowsById = new Map(userTableData.data.map(row => [row.id, row]));
    updatedTable.data = adminTable.data.map(adminRow => userRowsById.get(adminRow.id) || adminRow);

    console.log("🔄 Merged User Table With Admin Table:", JSON.stringify(updatedTable, null, 2));
    return updatedTable;
};

/**
 * 🔍 Check for new tables in the section that the user hasn't saved yet.
 */
const checkNewTables = async (userId, sectionId) => {
    try {
        const allTables = await Table.find({ section: sectionId }).lean();
        const userSavedTable = await UserTableData.findOne({ user: userId, section: sectionId }).lean();

        if (!userSavedTable) return allTables; // User has no saved table, return all tables.

        const savedTableId = userSavedTable.table.toString();
        return allTables.filter(table => table._id.toString() !== savedTableId);

    } catch (error) {
        console.error("❌ Error checking new tables:", error);
        return [];
    }
};

/**
 * 📝 Format table data:
 * - Ensures columns have `isEditable`.
 * - Ensures rows contain correct structure.
 */

const formatTableData = (table) => {
    // Ensure columns are mapped correctly
    table.columns = table.columns.map(col => ({
        ...col,
        isEditable: col.isEditable === true, // Ensure boolean
    }));

    // Iterate through rows to adjust column data
    table.data.forEach(row => {
        row.columns = row.columns.map(col => {
            const matchingColumn = table.columns.find(tc => tc.name === col.columnName);

            return {
                name: col.columnName || "Unnamed Column",
                value: col.value || "",  // Ensure value is present
                type: col.type || matchingColumn?.type || "text",
                isEditable: col.isEditable !== undefined ? col.isEditable : matchingColumn?.isEditable || false,
            };
        });
    });
};

// const formatTableData = (table) => {
//     table.columns = table.columns.map(col => ({
//         ...col,
//         isEditable: col.isEditable !== undefined ? col.isEditable : false
//     }));

//     table.data.forEach(row => {
//         row.columns = row.columns.map((col, index) => ({
//             name: table.columns[index]?.name || `Column ${index + 1}`,
//             value: col.value !== undefined ? col.value : "",
//             type: table.columns[index]?.type || "text",
//             isEditable: col.isEditable !== undefined ? col.isEditable : table.columns[index]?.isEditable || false
//         }));
//     });
// };

exports.saveTable = async (req, res) => {
    const { id } = req.params; // ✅ Extract table ID
    const { tableDescription, data, sectionId } = req.body; // ✅ Extract sectionId
    const userId = req.session.user?.id; // ✅ Extract user ID safely

    try {
        // Validate Object IDs
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(sectionId) || !mongoose.Types.ObjectId.isValid(id)) {
            req.flash("error", "Invalid User, Section, or Table ID");
            return res.redirect("/dashboard");
        }
        // Check if user and section exist
        const user = await User.findById(userId);
        const section = await Section.findById(sectionId);

        console.log("user:::", user);
        console.log("section:::", section);

        if (!user) {
            req.flash("error", "Please login first ❌");
            return res.redirect("/login");
        }
    

        // Validate tableData
        if (!Array.isArray(data) || data.length === 0) {
            req.flash("error", "No data provided to save ❌");
            return res.redirect(`/view-section/${sectionId}`);
        }

        // ✅ Extract unique column structure
        const columns = data?.[0]?.columns.map(col => ({
            name: col.name,
            type: col.type || "text",
            isEditable: col.isEditable === "true",

        })) || [];


        // ✅ Format and structure the data
        const formattedData = data.map((row, rowIndex) => ({
            rowNumber: rowIndex + 1,
            columns: row.columns.map((col) => {
                // 🔹 Match column by name and ensure boolean conversion for isEditable
                const columnConfig = columns.find(c => c.name === col.name);

                return {
                    columnName: col.name,
                    value: col.value || col.radioValue || "",
                    type: col.type || "text",
                    isEditable: columnConfig ? !!columnConfig.isEditable : false  // ✅ Convert to boolean
                };
            }),
        }));


        console.log("formated data:", JSON.stringify(formattedData, null, 2));
        // ✅ Calculate total marks and percentage
        let totalMarks = 0, maxMarks = 0;
        formattedData.forEach(row => {
            row.columns.forEach(col => {
                if (col.type === "mark") totalMarks += parseInt(col.value || 0);
                if (col.type === "max-mark") maxMarks += parseInt(col.value || 0);
            });
        });

        const percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;

        console.log("dtassssssdsagd:", id, userId, sectionId);
        // ✅ Find or create user table data to prevent duplicates
        let userTableData = await UserTableData.findOne({
            _id: id,
            user: user,
            section: section
        }).populate("section");
        console.log("Existing User Table Data Found:", userTableData);

        if (!userTableData) {
            // Create new user table data
            console.log("Creating new user table data...");
            userTableData = new UserTableData({
                user: user,
                section: section,
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
            // Update existing user table data
            console.log("Updating existing user table data...");
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
        console.log("Saved successfully!");
        res.redirect(`/view-section/${sectionId}`); // ✅ Ensure sectionId is defined
    } catch (error) {
        console.error("❌ Error:", error);
        req.flash("error", "Failed to update table data ❌");
        res.redirect(`/view-section/${sectionId || "fallback-section"}`); // ✅ Prevent crash if sectionId is missing
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
        const { username, category, studentCount, profileImageURL, googleMapsLink } = req.body;

        // Validate Google Maps embed link
        if (googleMapsLink && !googleMapsLink.startsWith("https://www.google.com/maps/embed")) {
            req.flash("error", "Invalid Google Maps embed link! Use the embed link format.");
            return res.redirect("/profile");
        }

        // Update user details
        await User.findByIdAndUpdate(req.session.user.id, {
            username,
            category,
            studentCount,
            profileImageURL,
            googleMapsLink
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