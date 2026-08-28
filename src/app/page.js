"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SearchForm, { REGIONS } from "@/components/SearchForm";
import SearchChips from "@/components/SearchChips";
import FeatureHighlights from "@/components/FeatureHighlights";
import ProfileCard from "@/components/ProfileCard";
import RankedCard from "@/components/RankedCard";
import MatchList from "@/components/MatchList";
import EmptyState from "@/components/EmptyState";

async function parseJsonResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned an unexpected response (status ${res.status})`);
  }
}

function getDefaultRegion() {
  if (typeof window === "undefined") return "na1";
  try {
    return window.localStorage.getItem("scuttle:defaultRegion") || "na1";
  } catch {
    return "na1";
  }
}

export default function Home() {
  const [platform, setPlatform] = useState(getDefaultRegion);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [ranked, setRanked] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");

  const regionLabel = useMemo(() => {
    return REGIONS.find((r) => r.value === platform)?.label || platform.toUpperCase();
  }, [platform]);

  const [ddVersion, setDdVersion] = useState(null);

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then((r) => r.json())
      .then((versions) => setDdVersion(versions?.[0] || null))
      .catch(() => setDdVersion(null));
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  async function handleSearch(e, override) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setProfile(null);
    setRanked(null);
    setMatches([]);

    const searchPlatform = override?.platform ?? platform;
    const searchName = override?.name ?? name;
    const searchTag = override?.tag ?? tag;

    try {
      // 1) Profile
      const pRes = await fetch(
        `/api/lol/profile?platform=${encodeURIComponent(searchPlatform)}&name=${encodeURIComponent(
          searchName.trim()
        )}&tag=${encodeURIComponent(searchTag.trim())}`
      );
      const pData = await parseJsonResponse(pRes);
      if (!pRes.ok) throw new Error(pData.error || "Profile fetch failed");
      setProfile(pData);

      // save recent search (non-blocking)
      fetch("/api/recent-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: searchPlatform,
          name: searchName.trim(),
          tag: searchTag.trim(),
        }),
      }).catch(() => {});

      // 2) Ranked (PUUID-based)
      const rRes = await fetch(
        `/api/lol/ranked?platform=${encodeURIComponent(searchPlatform)}&puuid=${encodeURIComponent(pData.puuid)}`
      );
      const rData = await parseJsonResponse(rRes);
      if (!rRes.ok) throw new Error(rData.error || "Ranked fetch failed");
      setRanked(rData);

      // 3) Match IDs
      const mRes = await fetch(
        `/api/lol/matches?platform=${encodeURIComponent(searchPlatform)}&puuid=${encodeURIComponent(
          pData.puuid
        )}&count=10`
      );
      const mData = await parseJsonResponse(mRes);
      if (!mRes.ok) throw new Error(mData.error || "Matches fetch failed");

      // 4) Match details (batch to reduce rate-limit risk)
      const ids = mData.matchIds || [];
      const results = [];

      for (let i = 0; i < ids.length; i += 2) {
        const batch = ids.slice(i, i + 2);
        const batchData = await Promise.all(
          batch.map(async (matchId) => {
            const res = await fetch(
              `/api/lol/match?platform=${encodeURIComponent(searchPlatform)}&matchId=${encodeURIComponent(matchId)}`
            );
            const data = await parseJsonResponse(res);
            if (!res.ok) throw new Error(data.error || "Match fetch failed");
            return data.match;
          })
        );
        results.push(...batchData);
      }

      const summaries = results
        .map((match) => {
          const info = match?.info;
          const me = info?.participants?.find((p) => p.puuid === pData.puuid);
          if (!info || !me) return null;

          return {
            platform: searchPlatform,
            matchId: match?.metadata?.matchId,
            queueId: info.queueId,
            gameVersion: info.gameVersion,
            championName: me.championName,
            teamPosition: me.teamPosition || "—",
            kills: me.kills,
            deaths: me.deaths,
            assists: me.assists,
            win: me.win,
          };
        })
        .filter(Boolean);

      setMatches(summaries);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleRecentPick(item) {
    setPlatform(item.platform);
    setName(item.name);
    setTag(item.tag);

    const fakeEvent = { preventDefault: () => {} };
    handleSearch(fakeEvent, item);
  }

  return (
    <main>
      <Navbar />

      <Hero>
        <SearchForm
          platform={platform}
          name={name}
          tag={tag}
          onPlatformChange={setPlatform}
          onNameChange={setName}
          onTagChange={setTag}
          onSubmit={handleSearch}
          loading={loading}
          error={error}
          regionLabel={regionLabel}
          onRecentPick={handleRecentPick}
        />

        <SearchChips onPick={handleRecentPick} />
      </Hero>

      <FeatureHighlights />

      <div className="mx-auto max-w-4xl px-4 pb-10 space-y-6">
        {profile && <ProfileCard profile={profile} platform={platform} />}

        {ranked && <RankedCard ranked={ranked} />}

        {matches.length > 0 && <MatchList matches={matches} />}

        {!loading && !profile && <EmptyState message="Enter a Riot ID above to fetch stats." />}
      </div>
    </main>
  );
}
