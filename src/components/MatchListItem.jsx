import { ChevronRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { championIconUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";

const QUEUE_NAMES = {
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

function queueName(queueId) {
  return QUEUE_NAMES[queueId] || `Queue ${queueId}`;
}

function kda(k, d, a) {
  const denom = d === 0 ? 1 : d;
  return ((k + a) / denom).toFixed(2);
}

export default function MatchListItem({ match: m }) {
  const stripe = m.win ? "border-l-win/60" : "border-l-loss/60";
  const icon = championIconUrl(m.championName);

  return (
    <a
      href={`/match/${m.platform}/${m.matchId}`}
      className={cn(
        "block rounded-2xl border border-border bg-surface p-3",
        "border-l-4",
        stripe,
        "transition hover:bg-overlay-hover",
        "shadow-sm hover:shadow-lg",
        m.win ? "hover:shadow-win/10" : "hover:shadow-loss/10"
      )}
    >
      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
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
            <div className="text-base font-semibold truncate text-text-primary">{m.championName}</div>
            <div className="text-sm text-text-secondary truncate">
              {queueName(m.queueId)} • {m.teamPosition}
            </div>
          </div>
        </div>

        <div className="justify-self-center">
          <Badge tone={m.win ? "win" : "loss"}>{m.win ? "WIN" : "LOSS"}</Badge>
        </div>

        <div className="justify-self-end text-right">
          <div className="font-mono text-sm text-text-primary">
            {m.kills}/{m.deaths}/{m.assists}
          </div>
          <div className="text-xs text-text-secondary">
            KDA <span className="text-text-primary">{kda(m.kills, m.deaths, m.assists)}</span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
      </div>
    </a>
  );
}
