const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = (passport) => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          // Find user by email and explicitly select password field
          const user = await User.findOne({ email }).select('+password');
          
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Verify password
          const isMatch = await user.comparePassword(password);
          if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Remove password before passing user object
          user.password = undefined;
          return done(null, user);
        } catch (err) {
          console.error('Passport authentication error:', err);
          return done(err);
        }
      }
    )
  );

  // Serialize user for the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id)
        .populate('connections', 'username profilePicture')
        .populate('pendingConnections', 'username profilePicture')
        .populate('groups', 'name');
      done(null, user);
    } catch (err) {
      console.error('Passport deserialization error:', err);
      done(err);
    }
  });
};
