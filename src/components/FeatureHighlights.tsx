import { Zap, Trophy, History, type LucideIcon } from "lucide-react";
import Card from "@/components/ui/Card";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const ITEMS: FeatureItem[] = [
  {
    icon: Zap,
    title: "Live Match Data",
    description: "Pull real-time profile and match info straight from the Riot API.",
  },
  {
    icon: Trophy,
    title: "Ranked Progress",
    description: "Track your solo queue and flex rank, tier, and LP at a glance.",
  },
  {
    icon: History,
    title: "Full Match History",
    description: "Browse recent games with champion, KDA, and win or loss detail.",
  },
];

export default function FeatureHighlights() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="flex flex-col items-center gap-2 p-5 text-center sm:items-start sm:text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <div className="font-semibold text-text-primary">{title}</div>
            <div className="text-sm text-text-secondary">{description}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}
