import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const generateUUID = () => {
  const uuid = uuidv4(); // generating a new uuid for users
  return uuid;
};

// Generates a cryptographically secure 64-character hex token for digital order tickets
const generateOrderToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export { generateUUID, generateOrderToken };
