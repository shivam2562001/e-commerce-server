const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const localStrategy = require("passport-local").Strategy;

module.exports = function (passport) {
  passport.use(
    new localStrategy({ usernameField: "email" },(email, password, done) => {
        
      User.findOne({ email: email }, (err, user) => {
        if (err) {
          return done(err, null);
        }
        if (!user) {
          return done("No user found", null);
        }

        const isPasswordValid = bcrypt.compareSync(password, user.password);

        if (!isPasswordValid) {
          return done("Email or Password not valid", null);
        }

        return done(null, user);
        });
    })
  );

  passport.serializeUser((user, cb) => {
    cb(null, user.email);
  });
  passport.deserializeUser((id, cb) => {
    User.findOne({ _id: id }, (err, user) => {
      const userInformation = {
        _id:user._id,
        username: user.username,
      };
      cb(err, userInformation);
    });
  });
};