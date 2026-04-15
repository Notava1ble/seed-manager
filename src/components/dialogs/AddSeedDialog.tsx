import { XIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Doc } from "../../../convex/_generated/dataModel";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ConvexError } from "convex/values";

function AddSeedDialog({
  leagues,
  isOpen,
  onClose,
}: {
  leagues: Doc<"leagues">[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [errors, setErrors] = useState();
  const [seedType, setSeedType] = useState<Doc<"seeds">["type"]>(undefined);
  const [owSeed, setOwSeed] = useState<string | undefined>(undefined);
  const [netherSeed, setNetherSeed] = useState<string | undefined>(undefined);
  const [endSeed, setEndSeed] = useState<string | undefined>(undefined);
  const [rngSeed, setRngSeed] = useState<string | undefined>(undefined);
  const [connectedLeague, setConnectedLeague] =
    useState<Doc<"seeds">["leagueId"]>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setSeedType(undefined);
    setOwSeed(undefined);
    setNetherSeed(undefined);
    setEndSeed(undefined);
    setRngSeed(undefined);
    setConnectedLeague(undefined);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const closeDialog = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate field data

    try {
      // Db call
      closeDialog();
    } catch (error) {
      // Set Errors
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent showCloseButton={false}>
      <DialogClose
        aria-label="Close"
        disabled={isSubmitting}
        onClick={closeDialog}
        render={
          <Button
            className="absolute top-2 right-2"
            size="icon-sm"
            variant="ghost"
          />
        }
        type="button"
      >
        <XIcon />
      </DialogClose>

      <DialogHeader>
        <DialogTitle>Add league</DialogTitle>
        <DialogDescription>
          Create a league group for seed review.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  );
}
export default AddSeedDialog;
