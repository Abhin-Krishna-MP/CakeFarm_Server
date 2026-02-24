import { httpServer } from "./app.js";
import connectDB from "./config/db/index.js";
import dotenv from "dotenv";
import { runCronJobForOrderExpiration } from "./cron/removeExpiredOrder.js";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 6005;
const startServer = () => {
  httpServer.listen(port, '0.0.0.0', () => {
    console.log("⚙️  Server is running on port: " + port);
  });
};

// connect to MongoDB then start the server
connectDB()
  .then(() => {
    console.log("\n🛢  Database connected successfully... \n");
    startServer();
    runCronJobForOrderExpiration();
  })
  .catch((err) => console.log("Error connecting to database: " + err.message));
