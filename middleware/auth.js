module.exports = {
    // Check if user is authenticated
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Please log in to access this page');
        res.redirect('/');
    },

    // Check if user is NOT authenticated (for login/register pages)
    forwardAuthenticated: function(req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        }
        res.redirect('/feed');
    },

    // Check if user is an admin
    ensureAdmin: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'admin') {
            return next();
        }
        req.flash('error_msg', 'Access denied. Admin privileges required.');
        res.redirect('/feed');
    },

    // Ensure user session is valid
    validateSession: function(req, res, next) {
        if (req.isAuthenticated()) {
            // Update session expiry
            req.session.touch();
            return next();
        }
        // Clear invalid session
        req.session.destroy((err) => {
            if (err) console.error('Session destruction error:', err);
            res.redirect('/');
        });
    }
};
