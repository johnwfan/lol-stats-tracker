"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AuthButton from "@/components/AuthButton";
import RecentSearches from "@/components/RecentSearches";

const REGIONS = [
  { label: "NA", value: "na1" },
  { label: "EUW", value: "euw1" },
  { label: "EUNE", value: "eun1" },
  { label: "KR", value: "kr" },
  { label: "JP", value: "jp1" },
  { label: "BR", value: "br1" },
  { label: "LAN", value: "la1" },
  { label: "LAS", value: "la2" },
  { label: "OCE", value: "oc1" },
  { label: "TR", value: "tr1" },
  { label: "RU", value: "ru" },
];

function queueName(queueId) {
  const map = {
    0: "Custom",
    400: "Normal Draft",
    430: "Normal Blind",
    440: "Ranked Flex",
    420: "Ranked Solo/Duo",
    450: "ARAM",
    490: "Quickplay",
    700: "Clash",
    830: "Co-op vs AI (Intro)",
    840: "Co-op vs AI (Beginner)",
    850: "Co-op vs AI (Intermediate)",
    900: "URF",
    1020: "One for All",
    1300: "Nexus Blitz",
    1400: "Ultimate Spellbook",
    1700: "Arena",
  };
  return map[queueId] || `Queue ${queueId}`;
}

function kda(k, d, a) {
  const denom = d === 0 ? 1 : d;
  return ((k + a) / denom).toFixed(2);
}

function rankedQueueName(queueType) {
  const map = {
    RANKED_SOLO_5x5: "Ranked Solo/Duo",
    RANKED_FLEX_SR: "Ranked Flex",
    RANKED_FLEX_TT: "Ranked Flex (TT)", // legacy, rarely seen
  };
  return map[queueType] || queueType || "Ranked";
}

function formatTierRank(entry) {
  if (!entry?.tier || !entry?.rank) return "Unranked";
  return `${entry.tier} ${entry.rank}`; // e.g. "GOLD II"
}

function winrate(wins, losses) {
  const total = (wins || 0) + (losses || 0);
  if (total === 0) return "—";
  return `${Math.round((wins / total) * 100)}%`;
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Card({ children, className }) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur",
        "shadow-sm shadow-black/30",
        "transition hover:-translate-y-[1px] hover:shadow-lg hover:shadow-black/40",
        className
      )}
    >
      {children}
    </div>
  );
}

function ddragonVersionFromGameVersion(gameVersion) {
  if (!gameVersion) return null;
  const parts = String(gameVersion).split(".");
  if (parts.length < 2) return null;
  if (parts.length >= 3) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  return `${parts[0]}.${parts[1]}.1`;
}

// Small set of known mismatches between Riot names and DDragon filenames
const CHAMPION_DDRAGON_EXCEPTIONS = {
  FiddleSticks: "Fiddlesticks",
  Wukong: "MonkeyKing",
  KhaZix: "Khazix",
  ChoGath: "Chogath",
  LeBlanc: "Leblanc",
};

function championToDdragonImageName(championName) {
  return CHAMPION_DDRAGON_EXCEPTIONS[championName] || championName;
}

function championIconUrl(championName) {
  const champ = championToDdragonImageName(championName);
  if (!champ) return null;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/${champ}_0.jpg`;
}

export default function Home() {
  const [platform, setPlatform] = useState("na1");
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

  // --- recent searches dropdown state ---
  const [recentOpen, setRecentOpen] = useState(false);
  const recentWrapRef = useRef(null);

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then((r) => r.json())
      .then((versions) => setDdVersion(versions?.[0] || null))
      .catch(() => setDdVersion(null));
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // close recent overlay on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (!recentWrapRef.current) return;
      if (!recentWrapRef.current.contains(e.target)) {
        setRecentOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setProfile(null);
    setRanked(null);
    setMatches([]);

    try {
      // 1) Profile
      const pRes = await fetch(
        `/api/lol/profile?platform=${encodeURIComponent(platform)}&name=${encodeURIComponent(
          name.trim()
        )}&tag=${encodeURIComponent(tag.trim())}`
      );
      const pData = await pRes.json();
      if (!pRes.ok) throw new Error(pData.error || "Profile fetch failed");
      setProfile(pData);

      // save recent search (non-blocking)
      fetch("/api/recent-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          name: name.trim(),
          tag: tag.trim(),
        }),
      }).catch(() => {});

      // close dropdown after a successful search
      setRecentOpen(false);

      // 2) Ranked (PUUID-based)
      const rRes = await fetch(
        `/api/lol/ranked?platform=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(pData.puuid)}`
      );
      const rData = await rRes.json();
      if (!rRes.ok) throw new Error(rData.error || "Ranked fetch failed");
      setRanked(rData);

      // 3) Match IDs
      const mRes = await fetch(
        `/api/lol/matches?platform=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(
          pData.puuid
        )}&count=10`
      );
      const mData = await mRes.json();
      if (!mRes.ok) throw new Error(mData.error || "Matches fetch failed");

      // 4) Match details (batch to reduce rate-limit risk)
      const ids = mData.matchIds || [];
      const results = [];

      for (let i = 0; i < ids.length; i += 2) {
        const batch = ids.slice(i, i + 2);
        const batchData = await Promise.all(
          batch.map(async (matchId) => {
            const res = await fetch(
              `/api/lol/match?platform=${encodeURIComponent(platform)}&matchId=${encodeURIComponent(matchId)}`
            );
            const data = await res.json();
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
            platform,
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

  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4 relative">
          <h1 className="text-center text-2xl md:text-3xl font-semibold tracking-tight">
            <span className="text-white">LoL</span>{" "}
            <span className="text-amber-400">Stats Tracker</span>
          </h1>

          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        {/* Search */}
        <Card className={cx("p-4 md:p-5 relative isolate", recentOpen && "z-50")}>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="text-sm text-white/70">
              Search by Riot ID <span className="text-white/50">(name + tag)</span>
            </div>

            {/* Anchor the overlay to this wrapper */}
            <div
              ref={recentWrapRef}
              className="relative"
              onFocusCapture={() => setRecentOpen(true)}
            >
              <div className="flex flex-col md:flex-row gap-2">
                {/* Region */}
                <div className="md:w-[140px]">
                  <label className="sr-only">Region</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className={cx(
                      "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3",
                      "text-white outline-none",
                      "focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
                    )}
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} ({r.value})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div className="flex-1">
                  <label className="sr-only">Riot Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Riot name (e.g., karh)"
                    className={cx(
                      "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3",
                      "text-white placeholder:text-white/40 outline-none",
                      "focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
                    )}
                  />
                </div>

                {/* Tag */}
                <div className="md:w-[140px]">
                  <label className="sr-only">Tag</label>
                  <input
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Tag (e.g., 0001)"
                    className={cx(
                      "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3",
                      "text-white placeholder:text-white/40 outline-none",
                      "focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
                    )}
                  />
                </div>

                {/* Button */}
                <button
                  disabled={loading}
                  className={cx(
                    "md:w-[140px] rounded-xl px-4 py-3 font-semibold",
                    "bg-amber-400 text-black",
                    "hover:bg-amber-300 transition",
                    "disabled:opacity-60 disabled:cursor-not-allowed"
                  )}
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>

              {/* Overlay dropdown under the inputs */}
              {recentOpen ? (
                <div className="absolute left-0 right-0 top-full mt-2 z-[9999]">
                  <RecentSearches
                    onPick={(it) => {
                      setPlatform(it.platform);
                      setName(it.name);
                      setTag(it.tag);

                      setRecentOpen(false);

                      // trigger a search after state updates
                      setTimeout(() => {
                        const fakeEvent = { preventDefault: () => {} };
                        handleSearch(fakeEvent);
                      }, 0);
                    }}
                  />
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {error}
              </div>
            ) : null}

            <div className="text-xs text-white/40">
              Region: <span className="text-white/60">{regionLabel}</span>
            </div>
          </form>
        </Card>

        {/* Profile */}
        {profile && (
          <Card className="p-4 md:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold tracking-tight">
                  {profile.name} <span className="text-white/40">#{profile.tag}</span>
                </div>
                <div className="mt-1 text-sm text-white/60">
                  Level <span className="text-white/80">{profile.summonerLevel}</span> •{" "}
                  <span className="text-white/80">
                    {profile.platform?.toUpperCase?.() || platform.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Accent “badge” */}
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                PUUID loaded
              </div>
            </div>
          </Card>
        )}

        {/* Ranked */}
        {ranked && (
          <Card className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Ranked</div>
              <div className="text-xs text-white/50">League-V4</div>
            </div>

            {ranked.rankedStatus === "UNRANKED" || !ranked.entries || ranked.entries.length === 0 ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                Unranked — play a ranked Solo/Duo or Flex match to populate this.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {ranked.entries
                  .slice()
                  .sort((a, b) => (a.queueType || "").localeCompare(b.queueType || ""))
                  .map((e) => {
                    const isSolo = e.queueType === "RANKED_SOLO_5x5";
                    const accent = isSolo ? "border-amber-400/30" : "border-white/10";
                    const pillBg = isSolo
                      ? "bg-amber-400/10 text-amber-200 border-amber-400/20"
                      : "bg-white/5 text-white/80 border-white/10";

                    return (
                      <div
                        key={e.queueType}
                        className={cx(
                          "rounded-2xl border bg-black/20 p-4",
                          "transition hover:bg-black/30 hover:shadow-lg hover:shadow-black/40",
                          accent
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm text-white/60">{rankedQueueName(e.queueType)}</div>
                            <div className="mt-1 text-xl font-semibold tracking-tight">
                              {formatTierRank(e)}
                              <span className="ml-2 text-sm font-medium text-white/60">
                                {e.leaguePoints ?? 0} LP
                              </span>
                            </div>
                          </div>

                          <div
                            className={cx(
                              "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
                              pillBg
                            )}
                          >
                            {e.hotStreak
                              ? "Hot Streak"
                              : e.veteran
                              ? "Veteran"
                              : e.freshBlood
                              ? "Fresh Blood"
                              : "Ranked"}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-white/50">Wins</div>
                            <div className="mt-1 text-base font-semibold">{e.wins ?? 0}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-white/50">Losses</div>
                            <div className="mt-1 text-base font-semibold">{e.losses ?? 0}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-white/50">Winrate</div>
                            <div className="mt-1 text-base font-semibold">{winrate(e.wins, e.losses)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        )}

        {/* Matches */}
        {matches.length > 0 && (
          <Card className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Recent Matches</div>
              <div className="text-xs text-white/50">Last {matches.length}</div>
            </div>

            <div className="mt-4 space-y-2">
              {matches.map((m) => {
                const pill = m.win
                  ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/20"
                  : "bg-rose-400/15 text-rose-200 border-rose-400/20";

                const stripe = m.win ? "border-l-emerald-400/60" : "border-l-rose-400/60";
                const icon = championIconUrl(m.championName);

                return (
                  <a
                    key={m.matchId}
                    href={`/match/${m.platform}/${m.matchId}`}
                    className={cx(
                      "block rounded-2xl border border-white/10 bg-black/20 p-3",
                      "border-l-4",
                      stripe,
                      "transition hover:bg-black/30",
                      "shadow-sm hover:shadow-lg",
                      m.win ? "hover:shadow-emerald-500/10" : "hover:shadow-rose-500/10"
                    )}
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 ">
                      {/* Left: Champion + queue */}
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                          {icon ? (
                            <img
                              src={icon}
                              alt={m.championName}
                              className="h-full w-full object-cover object-center"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="text-base font-semibold truncate">{m.championName}</div>
                          <div className="text-sm text-white/50 truncate">
                            {queueName(m.queueId)} • {m.teamPosition}
                          </div>
                        </div>
                      </div>

                      {/* Center: WIN/LOSS always centered */}
                      <div className="justify-self-center">
                        <div className={cx("rounded-full border px-3 py-1 text-xs font-semibold", pill)}>
                          {m.win ? "WIN" : "LOSS"}
                        </div>
                      </div>

                      {/* Right: KDA */}
                      <div className="justify-self-end text-right">
                        <div className="font-mono text-sm">
                          {m.kills}/{m.deaths}/{m.assists}
                        </div>
                        <div className="text-xs text-white/50">
                          KDA <span className="text-white/80">{kda(m.kills, m.deaths, m.assists)}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !profile && (
          <div className="text-center text-sm text-white/45">Enter a Riot ID above to fetch stats.</div>
        )}
      </div>
    </main>
  );
}
