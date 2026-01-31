const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Only configure Google OAuth if credentials are provided
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret && 
    googleClientId !== 'your_google_client_id_here' && 
    googleClientSecret !== 'your_google_client_secret_here') {
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Update Google ID if not set
            if (!user.googleId) {
              user.googleId = profile.id;
              user.profilePhoto = profile.photos[0]?.value || user.profilePhoto;
              await user.save();
            }
            return done(null, user);
          }

          // Create new user
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profilePhoto: profile.photos[0]?.value || undefined,
            accountType: 'user',
          });

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  console.log('✅ Google OAuth configured');
} else {
  console.log('⚠️  Google OAuth not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
