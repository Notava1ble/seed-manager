import { useMutation, useQuery } from "convex/react";
import { AlertCircleIcon, UserRound } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/errors";

export function SettingsPage() {
  const user = useQuery(api.users.currentUser);
  const updateAccountSettings = useMutation(api.users.updateAccountSettings);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const claimBuriedTreasureSeeds =
    user?.settings?.claimBuriedTreasureSeeds ?? true;

  const handleClaimBuriedTreasureChange = async (checked: boolean) => {
    setError(null);
    setIsSaving(true);

    try {
      await updateAccountSettings({ claimBuriedTreasureSeeds: checked });
    } catch (settingsError) {
      setError(getErrorMessage(settingsError, "Could not update settings"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <CardHeader>
          <CardDescription>
            Manage your seed claiming preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user === undefined ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : user === null ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Account unavailable</AlertTitle>
              <AlertDescription>
                Sign in again before changing account settings.
              </AlertDescription>
            </Alert>
          ) : (
            <FieldGroup>
              <Field orientation="horizontal" data-disabled={isSaving}>
                <Switch
                  id="claim-buried-treasure-seeds"
                  checked={claimBuriedTreasureSeeds}
                  disabled={isSaving}
                  onCheckedChange={(checked) => {
                    void handleClaimBuriedTreasureChange(checked);
                  }}
                />
                <FieldContent>
                  <FieldLabel htmlFor="claim-buried-treasure-seeds">
                    Claim buried treasure seeds
                  </FieldLabel>
                  <FieldDescription>
                    Turn this off to skip buried treasure seeds when you claim a
                    new seed.
                  </FieldDescription>
                </FieldContent>
              </Field>

              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
