import { type FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { ShieldAlert } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { LeagueAccessMultiSelect } from "@/components/LeagueAccessMultiSelect";
import { ManagedRoleFields } from "@/components/ManagedRoleFields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/errors";
import type { ManagedRole } from "@/lib/userAccess";

export function InviteUserDialog({
  leagues,
  onClose,
  onSuccess,
}: {
  leagues: Doc<"leagues">[];
  onClose: () => void;
  onSuccess: (activatedUserId: Id<"users">) => void;
}) {
  const activateUser = useMutation(api.users.activateUserByDiscordId);
  const [discordId, setDiscordId] = useState("");
  const [discordIdError, setDiscordIdError] = useState<string | null>(null);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [homeLeagueId, setHomeLeagueId] = useState<Id<"leagues">[]>([]);
  const [hostLeagueId, setHostLeagueId] = useState<Id<"leagues">[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDiscordId = discordId.trim();
    if (trimmedDiscordId.length === 0) {
      setDiscordIdError("Enter a Discord user ID");
      return;
    }

    setDiscordIdError(null);
    setFormError(null);
    setIsSubmitting(true);

    try {
      const activatedUserId = await activateUser({
        discordId: trimmedDiscordId,
        roles,
        makeAdmin,
        homeLeagueId,
        hostLeagueId,
      });
      onSuccess(activatedUserId);
    } catch (error) {
      setFormError(getErrorMessage(error, "Could not activate this user"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent
      showCloseButton={false}
      className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
    >
      <DialogHeader>
        <DialogTitle>Invite user</DialogTitle>
        <DialogDescription>
          Enter a Discord user ID and set their initial access. The user must
          have signed in once before they can be activated.
        </DialogDescription>
      </DialogHeader>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FieldGroup>
          <Field data-invalid={Boolean(discordIdError)}>
            <FieldLabel htmlFor="invite-discord-id">Discord user ID</FieldLabel>
            <Input
              id="invite-discord-id"
              aria-invalid={Boolean(discordIdError)}
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => {
                setDiscordId(event.currentTarget.value);
                setDiscordIdError(null);
              }}
              placeholder="123456789012345678"
              value={discordId}
            />
            <FieldError>{discordIdError}</FieldError>
          </Field>

          <ManagedRoleFields
            description="Choose tester and host access for this user."
            disabled={isSubmitting}
            idPrefix="invite"
            onRolesChange={setRoles}
            roles={roles}
          />

          <LeagueAccessMultiSelect
            description="A tester cannot see their home leagues through tester access."
            disabled={isSubmitting}
            id="invite-home-league"
            label="Home leagues"
            leagues={leagues}
            onValueChange={setHomeLeagueId}
            value={homeLeagueId}
          />

          <LeagueAccessMultiSelect
            description="A host can manage seeds only in their host leagues."
            disabled={isSubmitting}
            id="invite-host-league"
            label="Host leagues"
            leagues={leagues}
            onValueChange={setHostLeagueId}
            value={hostLeagueId}
          />

          <Field orientation="horizontal">
            <Switch
              checked={makeAdmin}
              disabled={isSubmitting}
              id="invite-make-admin"
              onCheckedChange={setMakeAdmin}
            />
            <FieldContent>
              <FieldLabel htmlFor="invite-make-admin">Make admin</FieldLabel>
              <FieldDescription>
                Admin users cannot be managed from this screen after activation.
              </FieldDescription>
            </FieldContent>
          </Field>

          {makeAdmin ? (
            <Alert variant="destructive">
              <ShieldAlert />
              <AlertTitle>Admin access is elevated</AlertTitle>
              <AlertDescription>
                Admins can view any seed and can modify or delete data that
                affects the whole system. Admin users are not editable through
                the app.
              </AlertDescription>
            </Alert>
          ) : null}
        </FieldGroup>

        <FieldError>{formError}</FieldError>

        <DialogFooter>
          <DialogClose
            disabled={isSubmitting}
            onClick={onClose}
            render={<Button variant="outline" />}
            type="button"
          >
            Cancel
          </DialogClose>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Inviting..." : "Invite user"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
