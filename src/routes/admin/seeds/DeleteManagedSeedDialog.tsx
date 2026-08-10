import type { FunctionReturnType } from "convex/server";
import { Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

type ManagedSeed = FunctionReturnType<
  typeof api.seedManagement.listSeeds
>[number];

export function DeleteManagedSeedDialog({
  deleting,
  onConfirm,
  onOpenChange,
  seed,
}: {
  deleting: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  seed: ManagedSeed | null;
}) {
  return (
    <AlertDialog
      open={seed !== null}
      onOpenChange={(open) => {
        if (!deleting) onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this seed permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            Seed {seed?.overworld ?? "unknown"} and all of its comments will be
            permanently deleted. The remaining seeds will be renumbered.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={() => void onConfirm()}
            variant="destructive"
          >
            {deleting && <Spinner data-icon="inline-start" />}
            Delete seed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
