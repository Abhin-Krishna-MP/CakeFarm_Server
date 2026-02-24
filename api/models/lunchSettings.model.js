import mongoose from "mongoose";

// Define Lunch Settings Schema
const lunchSettingsSchema = new mongoose.Schema(
  {
    orderDeadlineTime: {
      type: String, // Format: "HH:MM" (24-hour format, e.g., "10:30")
      required: true,
      default: "10:00",
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const LunchSettings = mongoose.model("LunchSettings", lunchSettingsSchema);

class LunchSettingsModel {
  // Get current lunch settings
  static getSettings = async () => {
    try {
      let settings = await LunchSettings.findOne().lean();
      
      // Create default settings if none exist
      if (!settings) {
        const defaultSettings = new LunchSettings({
          orderDeadlineTime: "10:00",
          isEnabled: true,
        });
        await defaultSettings.save();
        settings = defaultSettings.toObject();
      }
      
      return settings;
    } catch (error) {
      console.log("Error getting lunch settings", error);
      throw error;
    }
  };

  // Update lunch settings
  static updateSettings = async (updateData) => {
    try {
      let settings = await LunchSettings.findOne();
      
      if (!settings) {
        settings = new LunchSettings(updateData);
      } else {
        Object.assign(settings, updateData);
      }
      
      await settings.save();
      return settings.toObject();
    } catch (error) {
      console.log("Error updating lunch settings", error);
      throw error;
    }
  };

  // Check if lunch ordering is currently open
  static isOrderingOpen = async () => {
    try {
      const settings = await this.getSettings();
      
      if (!settings.isEnabled) {
        return false;
      }

      const now = new Date();
      const [hours, minutes] = settings.orderDeadlineTime.split(":");
      const deadline = new Date();
      deadline.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      return now < deadline;
    } catch (error) {
      console.log("Error checking lunch ordering status", error);
      return false;
    }
  };
}

export { LunchSettingsModel, LunchSettings };
