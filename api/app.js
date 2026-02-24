import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import cookieParser from "cookie-parser";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { errorHandler } from "./middlewares/error.middlewares.js";
import morgan from "morgan";
import session from "express-session";
import passport from "./config/passport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const httpServer = http.createServer(app);

// Build allowed-origins list (supports comma-separated values in CORS_ORIGIN)
const _rawOrigins = (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
const _corsOrigin = _rawOrigins.length === 1 ? _rawOrigins[0] : _rawOrigins.length > 1 ? _rawOrigins : false;

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: _corsOrigin || "*",
    credentials: true,
  },
  // Allow both websocket and long-polling so firewalls / proxies don't
  // silently drop the upgrade and leave the client with no connection.
  transports: ["websocket", "polling"],
});

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("Admin client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Admin client disconnected:", socket.id);
  });
});

// Make io accessible to controllers
app.set("io", io);
app.set("trust proxy", 1);
// global middlewares
app.use(
  cors({
    origin: _corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static(path.join(__dirname, "/public")));
app.use(cookieParser());
app.use(morgan("dev"));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// importing routes
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";
import authRouter from "./routes/auth.routes.js";
import lunchRouter from "./routes/lunch.routes.js";
import { profileUpload } from "./utils/multerSetup.js";

// app API's
app.get("/api/v1/test", (req, res) => {
  return res.send("hello world!");
});

// auth routes (Google OAuth)
app.use("/api/v1/auth", authRouter);

// user routes
app.use("/api/v1/users", userRouter);

// admin routes
app.use("/api/v1/admin", adminRouter);

// lunch routes
app.use("/api/v1/lunch", lunchRouter);

// custom error handler middleware
app.use(errorHandler);

export { httpServer };
