import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserModel, User } from "../models/user.model.js";
import { generateUUID } from "../utils/uuid.js";

// Load environment variables
dotenv.config();

passport.serializeUser((user, done) => {
  done(null, user.userId);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await UserModel.getUserById(userId);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id }).lean();

        if (user) {
          return done(null, user);
        }

        // Check if user exists with this email
        user = await User.findOne({ email: profile.emails[0].value }).lean();

        if (user) {
          // Link Google account to existing user
          await User.updateOne(
            { email: profile.emails[0].value },
            { $set: { googleId: profile.id } }
          );
          user.googleId = profile.id;
          return done(null, user);
        }

        // Create new user
        const newUser = new User({
          userId: generateUUID(),
          googleId: profile.id,
          email: profile.emails[0].value,
          username: profile.displayName,
          avatar: profile.photos[0]?.value || "noProfile.png",
        });

        await newUser.save();
        const savedUser = await UserModel.getUserById(newUser.userId);
        done(null, savedUser);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
