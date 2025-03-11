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
    const sections = await Section.find().lean();
    res.render("user/dashboard", { user: req.session.user, sections });
};

exports.viewSection = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            req.flash("error", "Section Not Found");
            return res.redirect("/dashboard");
        }

        const userId = req.session.user._id; // User ID from session

        console.log("🔍 Checking for user-saved table...");
        let userTableData = await UserTableData.findOne({ section: section._id, user: userId });

        if (userTableData) {
            console.log("✅ User has a saved table. Displaying...:", userTableData);
            return res.render("user/table", {
                table: userTableData.toObject(),
                user: req.session.user
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
            tables: tables.map(table => table.toObject())
        });

    } catch (err) {
        console.error("❌ Error in viewSection:", err);
        req.flash("error", "Something went wrong");
        res.redirect("/dashboard");
    }
};



exports.editTablePage = async (req, res) => {
    try {
        const { id } = req.params; // Table ID
        const userId = req.session.user._id; // Get user ID from session

        const table = await Table.findById(id);
        if (!table) {
            req.flash("error", "Table not found");
            return res.redirect("/dashboard");
        }

        // Ensure the user has permission to edit
        if (!table.user.equals(userId)) {
            req.flash("error", "Unauthorized access");
            return res.redirect("/dashboard");
        }

        res.render("user/edit-table", { user: req.session.user, table });
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong");
        res.redirect("/dashboard");
    }
};


exports.updateTable = async (req, res) => {
    try {
        const { id } = req.params; // Table ID
        const { data } = req.body;
        const userId = req.session.user._id; // Get user ID from session

        const table = await Table.findById(id);
        if (!table) {
            req.flash("error", "Table not found");
            return res.redirect("/user/dashboard");
        }

        // Ensure the user has permission to edit
        if (!table.user.equals(userId)) {
            req.flash("error", "Unauthorized access");
            return res.redirect("/user/dashboard");
        }

        // Update only editable columns
        table.data.forEach((row, rowIndex) => {
            row.columns.forEach((col, colIndex) => {
                const userInput = data[rowIndex]?.columns[colIndex]?.value;
                if (table.columns[colIndex].isEditable) {
                    col.value = userInput; // Only update if column is editable
                }
            });
        });

        await table.save();
        req.flash("success", "Table updated successfully!");
        res.redirect(`/table/edit/${table._id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong");
        res.redirect("/user/dashboard");
    }
};
