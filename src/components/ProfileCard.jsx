import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function ProfileCard({ profile, platform }) {
  return (
    <Card hover={false} className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold tracking-tight text-text-primary">
            {profile.name} <span className="text-text-muted">#{profile.tag}</span>
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            Level <span className="text-text-primary">{profile.summonerLevel}</span> •{" "}
            <span className="text-text-primary">
              {profile.platform?.toUpperCase?.() || platform.toUpperCase()}
            </span>
          </div>
        </div>

        <Badge tone="accent">PUUID loaded</Badge>
      </div>
    </Card>
  );
}
