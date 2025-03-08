// Admin Authentication Middleware
module.exports.isAdmin = (req, res, next) => {
    if (req.session.isAdmin) {
        const now = Date.now();
        const sessionAge = req.session.cookie.maxAge;

        if (now - req.session.lastAccess > sessionAge) {
            req.session.destroy();
            req.flash("error", "Session Expired! Please Login Again");
            return res.redirect("/admin/login");
        }

        req.session.lastAccess = now;
        next();
    } else {
        req.flash("error", "Please Login First");
        res.redirect("/admin/login");
    }
};


// User Authentication Middleware
module.exports.isUser = (req, res, next) => {
    if (req.session.user) {
        const now = Date.now();
        const sessionAge = req.session.cookie.maxAge;

        if (now - req.session.lastAccess > sessionAge) {
            req.session.destroy();
            req.flash("error", "Session Expired! Please Login Again");
            return res.redirect("/user/login");
        }

        req.session.lastAccess = now;
        next();
    } else {
        req.flash("error", "Please Login First");
        res.redirect("/user/login");
    }
};