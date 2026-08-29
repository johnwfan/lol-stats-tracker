import mongoose, { type Model } from "mongoose";

export interface ISummoner {
  platform: string;
  puuid: string;
  summonerId?: string;
  name?: string;
  tag?: string;
  profileIconId?: number;
  summonerLevel?: number;
  lastFetchedAt: Date;
}

const SummonerSchema = new mongoose.Schema<ISummoner>(
  {
    platform: { type: String, required: true },
    puuid: { type: String, required: true, index: true },
    summonerId: { type: String, index: true },
    name: String,
    tag: String,
    profileIconId: Number,
    summonerLevel: Number,
    lastFetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SummonerSchema.index({ platform: 1, puuid: 1 }, { unique: true });

export default (mongoose.models.Summoner as Model<ISummoner>) ||
  mongoose.model<ISummoner>("Summoner", SummonerSchema);
