const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Section = require('../models/Section');
const UserTableData = require('../models/UserTableData');
const Table = require('../models/Table');

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
            id: user._id,
            username: user.username,
            lastAccess: Date.now(),
        };
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




exports.viewSection = async (req, res) => {
    console.log("Session Data:", req.session);
    console.log("body:",req.params.id);

    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            req.flash("error", "Section Not Found");
            return res.redirect("/dashboard");
        }

        const userId = req.session.user._id; // User ID from session
        console.log("useriddddddddddddd:", userId);
        console.log("🔍 Checking for user-saved table...");

        let userTableData = await UserTableData.findOne({ section: section._id, user: userId }).populate("user");

        if (userTableData) {
            console.log("✅ User has a saved table. Displaying...:", userTableData);

            // ✅ Ensure each column has `isEditable` and sync it with `data.columns`
            userTableData.columns = userTableData.columns.map(col => ({
                ...col,
                isEditable: col.isEditable !== undefined ? col.isEditable : false // Default to false
            }));

            userTableData.data.forEach(row => {
                row.columns = row.columns.map((col, index) => ({
                    ...col,
                    type: userTableData.columns[index]?.type || "text", // Ensure type matches column definition
                    isEditable: userTableData.columns[index]?.isEditable || false // Sync with main columns
                }));
            });

            return res.render("user/table", {
                table: userTableData.toObject(),
                user: req.session.user,
                layout: "layout",
                headerType: "user-header",
            });
        }

        console.log("❌ No saved table found. Fetching admin-created tables...");
        let tables = await Table.find({ section: section._id }).populate("section");

        if (!tables.length) {
            console.log("⚠️ No tables available in this section.");
            req.flash("error", "No tables available for this section.");
            return res.redirect("/dashboard");
        }

        console.log("✅ Admin tables found. Processing...");

        // ✅ Ensure each column has `isEditable` and sync it with `data.columns`
        tables.forEach(table => {
            table.columns = table.columns.map(col => ({
                ...col,
                isEditable: col.isEditable !== undefined ? col.isEditable : false // Default to false
            }));

            table.data.forEach(row => {
                row.columns = row.columns.map((col, index) => ({
                    ...col,
                    type: table.columns[index]?.type || "text", // Ensure type matches column definition
                    isEditable: table.columns[index]?.isEditable || false // Sync with main columns
                }));
            });
        });

        console.log("✅ Tables processed successfully.");

        res.render("user/table", {
            section: section.toObject(),
            user: req.session.user,
            tables: tables.map(table => table.toObject()),
            layout: "layout",
            headerType: "user-header",
        });

    } catch (err) {
        console.error("❌ Error in viewSection:", err);
        req.flash("error", "Something went wrong");
        res.redirect("/dashboard");
    }
};


// exports.editTablePage = async (req, res) => {
//     try {
//         const { id } = req.params; // Table ID
//         const userId = req.session.user._id; // Get user ID from session

//         const table = await Table.findById(id);
//         if (!table) {
//             req.flash("error", "Table not found");
//             return res.redirect("/dashboard");
//         }

//         // Ensure the user has permission to edit
//         if (!table.user.equals(userId)) {
//             req.flash("error", "Unauthorized access");
//             return res.redirect("/dashboard");
//         }

//         res.render("user/edit-table", { user: req.session.user, table });
//     } catch (err) {
//         console.error(err);
//         req.flash("error", "Something went wrong");
//         res.redirect("/dashboard");
//     }
// };


exports.saveTable = async (req, res) => {
    console.log("Received Data:");
    console.log("Columns Data:", req.body.columns);


    try {
        const { id } = req.params; // Corrected table ID access
        const { tableDescription, data, sectionId } = req.body;

        if (!req.session.user) {
            req.flash("error", "Please login first ❌");
            return res.redirect("/login");
        }

        // **Extract unique column structure**
        const columns = data[0]?.columns.map((col) => ({
            name: col.name,
            type: col.type || "text",
            isEditable: col.isEditable ?? true
        })) || [];

        // Format and structure the data
        const formattedData = data.map((row, rowIndex) => ({
            rowNumber: rowIndex + 1,
            columns: row.columns.map((col, colIndex) => ({
                columnName: col.name,
                value: col.value,
                type: col.type,
                isEditable: col.isEditable ?? true
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
                user: req.session.user._id, // Ensure user is logged in
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
        res.redirect("/user/table"); // Fixed redirect path
    } catch (error) {
        console.error("❌ Error:", error);
        req.flash("error", "Failed to update table data ❌");
        res.redirect("/user/table");
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