import { useMutation } from "convex/react";
import { Doc } from "../../../convex/_generated/dataModel";
import { FormEvent, useEffect, useState } from "react";
import {
  getLeagueMutationArgs,
  LeagueFormErrors,
  limitLeagueName,
  MAX_LEAGUE_NAME_LENGTH,
  MIN_LEAGUE_NAME_LENGTH,
  preventNonNumericInput,
  sanitizeLeagueNumber,
  validateLeagueForm,
} from "@/lib/leagueFormUtils";
import { ConvexError } from "convex/values";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { XIcon } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Input } from "../ui/input";
import { api } from "../../../convex/_generated/api";

export function EditLeagueDialog({
  league,
  onClose,
}: {
  league: Doc<"leagues">;
  onClose: () => void;
}) {
  const updateLeague = useMutation(api.leagues.updateLeague);
  const [leagueNumber, setLeagueNumber] = useState(String(league.leagueNumber));
  const [leagueName, setLeagueName] = useState(league.leagueName);
  const [errors, setErrors] = useState<LeagueFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLeagueNumber(String(league.leagueNumber));
    setLeagueName(league.leagueName);
    setErrors({});
  }, [league._id, league.leagueName, league.leagueNumber]);

  const closeDialog = () => {
    setErrors({});
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const values = { leagueNumber, leagueName };
    const validationErrors = validateLeagueForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updateLeague({
        leagueId: league._id,
        ...getLeagueMutationArgs(values),
      });
      closeDialog();
    } catch (error) {
      setErrors({
        form:
          error instanceof ConvexError
            ? error.data.message
            : "Could not update this league",
      });
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
        <DialogTitle>Edit league</DialogTitle>
        <DialogDescription>
          Update the league number and name. This will keep the existing seeds
          connected to this league.
        </DialogDescription>
      </DialogHeader>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FieldGroup>
          <Field data-invalid={Boolean(errors.leagueNumber)}>
            <FieldLabel htmlFor="edit-league-number">League number</FieldLabel>
            <Input
              id="edit-league-number"
              aria-invalid={Boolean(errors.leagueNumber)}
              inputMode="numeric"
              min={1}
              onChange={(event) =>
                setLeagueNumber(sanitizeLeagueNumber(event.currentTarget.value))
              }
              onKeyDown={preventNonNumericInput}
              pattern="[0-9]*"
              placeholder="1"
              required
              step={1}
              type="number"
              value={leagueNumber}
            />
            <FieldDescription>Use a positive whole number.</FieldDescription>
            <FieldError>{errors.leagueNumber}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.leagueName)}>
            <FieldLabel htmlFor="edit-league-name">League name</FieldLabel>
            <Input
              id="edit-league-name"
              aria-invalid={Boolean(errors.leagueName)}
              maxLength={MAX_LEAGUE_NAME_LENGTH}
              minLength={MIN_LEAGUE_NAME_LENGTH}
              onChange={(event) =>
                setLeagueName(limitLeagueName(event.currentTarget.value))
              }
              placeholder="League 1"
              required
              type="text"
              value={leagueName}
            />
            <FieldDescription>
              {MIN_LEAGUE_NAME_LENGTH}-{MAX_LEAGUE_NAME_LENGTH} characters.
            </FieldDescription>
            <FieldError>{errors.leagueName}</FieldError>
          </Field>
        </FieldGroup>

        <FieldError>{errors.form}</FieldError>

        <DialogFooter>
          <DialogClose
            disabled={isSubmitting}
            onClick={closeDialog}
            render={<Button variant="outline" />}
            type="button"
          >
            Cancel
          </DialogClose>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
