import mongoose from "mongoose";

const SummonerSchema = new mongoose.Schema(
{
    platform: { type: String, required: true},
    puuid: { type: String, required: true, index: true },
    summonerId: { type: String, index: true },
    name: String,
    tag: String,
    ProfileIconId: Number,
    summonerLevel: Number,
    lastFetchedAt: { type: Date, default: Date.now },
},
{ timestamps: true }
);


SummonerSchema.index({platform: 1, puuid: 1}, { unique: true });

export default mongoose.models.Summoner || mongoose.model("Summoner", SummonerSchema);

