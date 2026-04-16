import { type FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { ShieldAlert } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type ManagedRole = "host" | "tester";

const EMPTY_LEAGUE_VALUE = null;

export function InviteUserDialog({
  leagues,
  onClose,
  onSuccess,
  username,
}: {
  leagues: Doc<"leagues">[];
  onClose: () => void;
  onSuccess: (activatedUserId: Id<"users">) => void;
  username: string;
}) {
  const activateUser = useMutation(api.users.activateUserByGithubUsername);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [homeLeagueId, setHomeLeagueId] = useState<Id<"leagues"> | null>(null);
  const [hostLeagueId, setHostLeagueId] = useState<Id<"leagues"> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setRole = (role: ManagedRole, checked: boolean) => {
    setRoles((currentRoles) => {
      if (checked) {
        return currentRoles.includes(role)
          ? currentRoles
          : [...currentRoles, role];
      }

      return currentRoles.filter((currentRole) => currentRole !== role);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const activatedUserId = await activateUser({
        username,
        roles,
        makeAdmin,
        homeLeagueId: homeLeagueId ?? undefined,
        hostLeagueId: hostLeagueId ?? undefined,
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
        <DialogTitle>Activate user</DialogTitle>
        <DialogDescription>
          Set initial access for @{username}. This user will become active after
          saving.
        </DialogDescription>
      </DialogHeader>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Roles</FieldLegend>
            <FieldDescription>
              Choose tester and host access for this user.
            </FieldDescription>
            <FieldGroup data-slot="checkbox-group">
              <Field orientation="horizontal">
                <Checkbox
                  checked={roles.includes("tester")}
                  disabled={isSubmitting}
                  id="invite-role-tester"
                  onCheckedChange={(checked) =>
                    setRole("tester", checked === true)
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor="invite-role-tester">Tester</FieldLabel>
                  <FieldDescription>
                    Can claim and review unassigned seeds.
                  </FieldDescription>
                </FieldContent>
              </Field>

              <Field orientation="horizontal">
                <Checkbox
                  checked={roles.includes("host")}
                  disabled={isSubmitting}
                  id="invite-role-host"
                  onCheckedChange={(checked) =>
                    setRole("host", checked === true)
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor="invite-role-host">Host</FieldLabel>
                  <FieldDescription>
                    Can manage seeds in their host league.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor="invite-home-league">Home league</FieldLabel>
            <Select
              disabled={isSubmitting}
              itemToStringLabel={(leagueId) =>
                leagueId === null
                  ? "No league"
                  : (leagues.find((league) => league._id === leagueId)
                      ?.leagueName ?? "Unknown league")
              }
              onValueChange={(nextValue) => setHomeLeagueId(nextValue)}
              value={homeLeagueId}
            >
              <SelectTrigger id="invite-home-league" className="w-full">
                <SelectValue placeholder="No league" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Home league</SelectLabel>
                  <SelectItem value={EMPTY_LEAGUE_VALUE}>No league</SelectItem>
                  {leagues.map((league) => (
                    <SelectItem key={league._id} value={league._id}>
                      {league.leagueName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              A tester cannot see their home league through tester access.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="invite-host-league">Host league</FieldLabel>
            <Select
              disabled={isSubmitting}
              itemToStringLabel={(leagueId) =>
                leagueId === null
                  ? "No league"
                  : (leagues.find((league) => league._id === leagueId)
                      ?.leagueName ?? "Unknown league")
              }
              onValueChange={(nextValue) => setHostLeagueId(nextValue)}
              value={hostLeagueId}
            >
              <SelectTrigger id="invite-host-league" className="w-full">
                <SelectValue placeholder="No league" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Host league</SelectLabel>
                  <SelectItem value={EMPTY_LEAGUE_VALUE}>No league</SelectItem>
                  {leagues.map((league) => (
                    <SelectItem key={league._id} value={league._id}>
                      {league.leagueName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              A host can manage seeds only in their host league.
            </FieldDescription>
          </Field>

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
            {isSubmitting ? "Activating..." : "Activate user"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ConvexError) {
    const data = error.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
