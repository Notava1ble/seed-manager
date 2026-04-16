import { AlertCircleIcon, XIcon } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEED_TYPES, seedTypesArray } from "@/lib/consts";
import {
  MAX_SEED_IMPORT_COUNT,
  preventNonNumericSeedInput,
  sanitizeSeedNumber,
  type SeedFormErrors,
  type SeedFormValues,
} from "@/lib/seedFormUtils";
import { validateManualSeedForm } from "@/lib/validators";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ConvexError } from "convex/values";

const EMPTY_SEED_FORM_VALUES: SeedFormValues = {
  type: null,
  leagueId: null,
  overworld: "",
  nether: "",
  end: "",
  rng: "",
};

type ImportTab = "manual" | "json";

function AddSeedDialog({
  leagues,
  onClose,
}: {
  leagues: Doc<"leagues">[];
  onClose: () => void;
}) {
  const importSeeds = useMutation(api.seeds.importSeeds);

  const [activeTab, setActiveTab] = useState<ImportTab>("manual");
  const [manualValues, setManualValues] = useState<SeedFormValues>(
    EMPTY_SEED_FORM_VALUES,
  );
  const [manualErrors, setManualErrors] = useState<SeedFormErrors>({});
  const [, setJsonFile] = useState<File | null>(null);
  const [jsonErrors, setJsonErrors] = useState<SeedFormErrors>({});

  const resetForm = () => {
    setActiveTab("manual");
    setManualValues(EMPTY_SEED_FORM_VALUES);
    setManualErrors({});
    setJsonFile(null);
    setJsonErrors({});
  };

  const closeDialog = () => {
    resetForm();
    onClose();
  };

  const updateManualValue = <Key extends keyof SeedFormValues>(
    key: Key,
    value: SeedFormValues[Key],
  ) => {
    setManualValues((current) => ({ ...current, [key]: value }));
  };

  const handleTabChange = (value: unknown) => {
    if (value !== "manual" && value !== "json") {
      return;
    }

    setActiveTab(value);
    setManualErrors({});
    setJsonErrors({});
  };

  const handleManualImport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const preparedData = [
      {
        ...manualValues,
        leagueId: manualValues.leagueId || undefined,
      },
    ];

    const validatedData = validateManualSeedForm.safeParse(preparedData);
    if (!validatedData.success) {
      console.error(validatedData.error); // TODO: Properly set the error states
      setManualErrors({
        form: "Validation Errors occured. For more info, check the dev tools.",
      });
      return;
    }

    try {
      await importSeeds({ seeds: validatedData.data });
      // Potentially show a sonnar notifying how many seeds were imported.

      closeDialog();
    } catch (error) {
      setManualErrors({
        form:
          error instanceof ConvexError
            ? error.data.message
            : "Could not add this league",
      });
    } finally {
      // TODO: Add submitting state and disable inputs while submitting
    }
  };
  return (
    <DialogContent
      className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
      showCloseButton={false}
    >
      <DialogClose
        aria-label="Close"
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
        <DialogTitle>Add seeds</DialogTitle>
        <DialogDescription>
          Import seed records from JSON or add one seed manually.
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="manual">Manual input</TabsTrigger>
          <TabsTrigger value="json">JSON import</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <form className="flex flex-col gap-4" onSubmit={handleManualImport}>
            <FieldGroup>
              <Field data-invalid={Boolean(manualErrors.type)}>
                <FieldLabel htmlFor="seed-type">Seed type</FieldLabel>
                <Select
                  value={manualValues.type}
                  itemToStringLabel={(type) => SEED_TYPES[type]}
                  onValueChange={(value) => updateManualValue("type", value)}
                >
                  <SelectTrigger
                    id="seed-type"
                    aria-invalid={Boolean(manualErrors.type)}
                    className="w-full"
                  >
                    <SelectValue placeholder="Choose seed type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Seed types</SelectLabel>
                      {seedTypesArray.map((type) => (
                        <SelectItem key={type} value={type}>
                          {SEED_TYPES[type]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{manualErrors.type}</FieldError>
              </Field>

              <Field data-invalid={Boolean(manualErrors.leagueId)}>
                <FieldLabel htmlFor="seed-league">League</FieldLabel>
                <Select
                  value={manualValues.leagueId}
                  itemToStringLabel={(leagueId) =>
                    leagues.find((league) => league._id === leagueId)
                      ?.leagueName ?? "Unknown league"
                  }
                  onValueChange={(value) =>
                    updateManualValue("leagueId", value)
                  }
                >
                  <SelectTrigger
                    id="seed-league"
                    aria-invalid={Boolean(manualErrors.leagueId)}
                    className="w-full"
                  >
                    <SelectValue placeholder="No league" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>League assignment</SelectLabel>
                      <SelectItem value={null}>No league</SelectItem>
                      {leagues.map((league) => (
                        <SelectItem key={league._id} value={league._id}>
                          {league.leagueName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Leave unset when the seed is not assigned yet.
                </FieldDescription>
                <FieldError>{manualErrors.leagueId}</FieldError>
              </Field>

              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <SeedNumberField
                  id="overworld-seed"
                  label="Overworld seed"
                  error={manualErrors.overworld}
                  value={manualValues.overworld}
                  onChange={(value) =>
                    updateManualValue("overworld", sanitizeSeedNumber(value))
                  }
                />
                <SeedNumberField
                  id="nether-seed"
                  label="Nether seed"
                  error={manualErrors.nether}
                  value={manualValues.nether}
                  onChange={(value) =>
                    updateManualValue("nether", sanitizeSeedNumber(value))
                  }
                />
                <SeedNumberField
                  id="end-seed"
                  label="End seed"
                  error={manualErrors.end}
                  value={manualValues.end}
                  onChange={(value) =>
                    updateManualValue("end", sanitizeSeedNumber(value))
                  }
                />
                <SeedNumberField
                  id="rng-seed"
                  label="RNG seed"
                  error={manualErrors.rng}
                  value={manualValues.rng}
                  onChange={(value) =>
                    updateManualValue("rng", sanitizeSeedNumber(value))
                  }
                />
              </FieldGroup>
            </FieldGroup>

            {manualErrors.form && (
              <ErrorAlert title="Seed not saved" message={manualErrors.form} />
            )}

            <DialogFooter>
              <DialogClose
                onClick={closeDialog}
                render={<Button variant="outline" />}
                type="button"
              >
                Cancel
              </DialogClose>
              <Button type="submit">Add seed</Button>
            </DialogFooter>
          </form>
        </TabsContent>

        <TabsContent value="json">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(jsonErrors.file)}>
                <FieldLabel htmlFor="seed-json-file">JSON file</FieldLabel>
                <Input
                  id="seed-json-file"
                  accept=".json,application/json"
                  aria-invalid={Boolean(jsonErrors.file)}
                  onChange={(event) =>
                    setJsonFile(event.currentTarget.files?.[0] ?? null)
                  }
                  type="file"
                />
                <FieldDescription>
                  Import a JSON array or an object with a seeds array. Each seed
                  needs type, overworld, nether, end, rng, and optional
                  leagueId. Limit {MAX_SEED_IMPORT_COUNT} seeds.
                </FieldDescription>
                <FieldError>{jsonErrors.file}</FieldError>
              </Field>
            </FieldGroup>

            {jsonErrors.form && (
              <ErrorAlert title="Import failed" message={jsonErrors.form} />
            )}

            <DialogFooter>
              <DialogClose
                onClick={closeDialog}
                render={<Button variant="outline" />}
                type="button"
              >
                Cancel
              </DialogClose>
              <Button type="submit">Import JSON</Button>
            </DialogFooter>
          </form>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

function SeedNumberField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        inputMode="numeric"
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={preventNonNumericSeedInput}
        pattern="[0-9]*"
        placeholder="123456789"
        required
        type="text"
        value={value}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="whitespace-pre-line">
        {message}
      </AlertDescription>
    </Alert>
  );
}

export default AddSeedDialog;
