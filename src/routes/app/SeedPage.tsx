import { useParams } from "react-router";
import { SeedVoting } from "@/components/SeedFeedbackActions";
import { SEEDS } from "./seeds";

export function SeedPage() {
  const { seedId } = useParams();
  const selectedSeed = SEEDS.find((s) => s.id === Number(seedId));

  if (!selectedSeed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Seed not found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Seed Details
      </p>
      <h2 className="text-2xl font-semibold">{selectedSeed.seedType}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Overworld</p>
          <p className="text-sm">{selectedSeed.overworld}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Nether</p>
          <p className="text-sm">{selectedSeed.nether}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">End</p>
          <p className="text-sm">{selectedSeed.end}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">RNG</p>
          <p className="text-sm">{selectedSeed.rng}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SeedVoting
          comments={selectedSeed.comments}
          downvotes={selectedSeed.downvotes}
          upvotes={selectedSeed.upvotes}
        />
      </div>
      {/* TODO: Comments section */}
    </div>
  );
}
