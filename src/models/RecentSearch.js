import mongoose from "mongoose";

const RecentSearchSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, index: true },
    platform: { type: String, required: true },
    name: { type: String, required: true },
    tag: { type: String, required: true },
    lastSearchedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// de-dupe per user + account + platform
RecentSearchSchema.index(
  { userEmail: 1, platform: 1, name: 1, tag: 1 },
  { unique: true }
);

export default mongoose.models.RecentSearch ||
  mongoose.model("RecentSearch", RecentSearchSchema);
