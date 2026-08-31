import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { profileIconUrl } from "@/lib/ddragon";
import { formatRelativeTime } from "@/lib/utils";
import type { ProfileData } from "@/types/domain";

interface ProfileCardProps {
  profile: ProfileData;
  platform: string;
  ddVersion: string | null;
}

export default function ProfileCard({ profile, platform, ddVersion }: ProfileCardProps) {
  const iconUrl = profileIconUrl(profile.profileIconId, ddVersion);

  return (
    <Card hover={false} className="p-5 md:p-6">
      <div className="flex items-center gap-4">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-2xl border border-border-strong"
          />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-2xl border border-border-strong bg-surface" />
        )}

        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold tracking-tight text-text-primary">
            {profile.name} <span className="text-text-muted">#{profile.tag}</span>
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            Level <span className="text-text-primary">{profile.summonerLevel}</span> •{" "}
            <span className="text-text-primary">{profile.platform?.toUpperCase?.() || platform.toUpperCase()}</span>
          </div>
        </div>

        {profile.lastFetchedAt ? (
          <Badge tone="default" className="shrink-0">
            Updated {formatRelativeTime(new Date(profile.lastFetchedAt).getTime())}
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}
