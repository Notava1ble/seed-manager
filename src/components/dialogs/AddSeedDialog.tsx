import { AlertCircleIcon, CheckCircle2Icon, XIcon } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
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
import { getErrorMessage } from "@/lib/errors";
import {
  MAX_SEED_IMPORT_COUNT,
  preventNonNumericSeedInput,
  sanitizeSeedNumber,
  type SeedFormErrors,
  type SeedFormValues,
  type SeedJsonUploadInput,
} from "@/lib/seedFormUtils";
import { validateManualSeedForm } from "@/lib/validators";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { parseSeedJsonImportFile } from "@/lib/seedJsonImport";

const EMPTY_SEED_FORM_VALUES: SeedFormValues = {
  type: null,
  leagueId: null,
  overworld: "",
  nether: "",
  end: "",
  rng: "",
};

type ImportTab = "manual" | "json";
type JsonImportResult = {
  insertedCount: number;
  skipCount: number;
};

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
  const [jsonFileName, setJsonFileName] = useState("");
  const [jsonSeeds, setJsonSeeds] = useState<SeedJsonUploadInput[] | null>(
    null,
  );
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const [jsonImportResult, setJsonImportResult] =
    useState<JsonImportResult | null>(null);
  const [isReadingJson, setIsReadingJson] = useState(false);
  const [isImportingJson, setIsImportingJson] = useState(false);

  const resetForm = () => {
    setActiveTab("manual");
    setManualValues(EMPTY_SEED_FORM_VALUES);
    setManualErrors({});
    setJsonFileName("");
    setJsonSeeds(null);
    setJsonErrors([]);
    setJsonImportError(null);
    setJsonImportResult(null);
    setIsReadingJson(false);
    setIsImportingJson(false);
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
    setJsonErrors([]);
    setJsonImportError(null);
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
      setManualErrors(getManualSeedFormErrors(validatedData.error.issues));
      return;
    }

    try {
      const result = await importSeeds({ seeds: validatedData.data });

      if (result.insertedCount === 0) {
        setManualErrors({ form: "Seed already exists" });
        return;
      }

      closeDialog();
    } catch (error) {
      setManualErrors({
        form: getErrorMessage(error, "Could not add this seed"),
      });
    } finally {
      // TODO: Add submitting state and disable inputs while submitting
    }
  };

  const handleJsonFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;

    setJsonFileName(file?.name ?? "");
    setJsonSeeds(null);
    setJsonErrors([]);
    setJsonImportError(null);
    setJsonImportResult(null);

    if (!file) {
      return;
    }

    try {
      setIsReadingJson(true);
      const result = await parseSeedJsonImportFile(file);

      if (result.success) {
        setJsonSeeds(result.seeds);
        return;
      }

      setJsonErrors(result.errors);
    } catch {
      setJsonErrors(["file: Could not read the uploaded file"]);
    } finally {
      setIsReadingJson(false);
    }
  };

  const handleJsonImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJsonImportError(null);
    setJsonImportResult(null);

    if (!jsonSeeds) {
      setJsonErrors(["file: Upload a valid JSONL file before importing"]);
      return;
    }

    setIsImportingJson(true);

    try {
      const seeds = jsonSeeds.map(({ type, overworld, nether, end, rng }) => ({
        type,
        overworld,
        nether,
        end,
        rng,
      }));
      const result = await importSeeds({ seeds });
      setJsonImportResult(result);
    } catch (error) {
      setJsonImportError(
        getErrorMessage(error, "Could not import seeds from this file"),
      );
    } finally {
      setIsImportingJson(false);
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
          Import seed records from JSONL or add one seed manually.
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="manual">Manual input</TabsTrigger>
          <TabsTrigger value="json">JSONL import</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              void handleManualImport(event);
            }}
          >
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
                Close
              </DialogClose>
              <Button type="submit">Add seed</Button>
            </DialogFooter>
          </form>
        </TabsContent>

        <TabsContent value="json">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              void handleJsonImport(event);
            }}
          >
            <FieldGroup>
              <Field data-invalid={jsonErrors.length > 0}>
                <FieldLabel htmlFor="seed-json-file">JSONL file</FieldLabel>
                <Input
                  id="seed-json-file"
                  accept=".jsonl,.ndjson,application/x-ndjson,application/jsonl,text/plain"
                  aria-invalid={jsonErrors.length > 0}
                  onChange={(event) => {
                    void handleJsonFileChange(event);
                  }}
                  type="file"
                />
                <FieldDescription>
                  Upload one JSON object per line. Only stored seed fields are
                  imported, and league fields in the file are ignored. Limit{" "}
                  {MAX_SEED_IMPORT_COUNT} seeds.
                </FieldDescription>
                <FieldError>{jsonErrors[0]}</FieldError>
              </Field>
            </FieldGroup>

            {isReadingJson && (
              <Alert>
                <AlertCircleIcon />
                <AlertTitle>Reading JSONL</AlertTitle>
                <AlertDescription>
                  Checking the uploaded file before import.
                </AlertDescription>
              </Alert>
            )}

            {!isReadingJson && jsonSeeds && !jsonImportResult && (
              <Alert>
                <CheckCircle2Icon />
                <AlertTitle>
                  {jsonSeeds.length === 1
                    ? "1 valid seed"
                    : `${jsonSeeds.length} valid seeds`}
                </AlertTitle>
                <AlertDescription>
                  {jsonFileName} passed validation. Duplicate overworld seeds
                  already in the database will be skipped. Imported seeds stay
                  unassigned.
                </AlertDescription>
              </Alert>
            )}

            {jsonErrors.length > 0 && (
              <ErrorAlert
                title="JSONL schema errors"
                message={jsonErrors.join("\n")}
              />
            )}

            {jsonImportError && (
              <ErrorAlert title="Import failed" message={jsonImportError} />
            )}

            {jsonImportResult && (
              <Alert>
                <CheckCircle2Icon />
                <AlertTitle>Import complete</AlertTitle>
                <AlertDescription>
                  {jsonImportResult.insertedCount} seeds imported.{" "}
                  {jsonImportResult.skipCount} duplicates skipped. Imported
                  seeds are unassigned.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <DialogClose
                onClick={closeDialog}
                render={<Button variant="outline" />}
                type="button"
              >
                Close
              </DialogClose>
              <Button
                disabled={
                  isReadingJson ||
                  isImportingJson ||
                  !jsonSeeds ||
                  Boolean(jsonImportResult)
                }
                type="submit"
              >
                {isImportingJson ? "Importing" : "Import JSONL"}
              </Button>
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
        pattern="-?[0-9]*"
        placeholder="-198106162748994949"
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

function getManualSeedFormErrors(
  issues: Array<{ message: string; path: PropertyKey[] }>,
) {
  const errors: SeedFormErrors = {};

  for (const issue of issues) {
    const field = issue.path.find(isSeedFormField);

    if (field) {
      errors[field] ??= issue.message;
      continue;
    }

    errors.form ??= issue.message;
  }

  return errors;
}

function isSeedFormField(value: unknown): value is keyof SeedFormValues {
  return (
    value === "type" ||
    value === "leagueId" ||
    value === "overworld" ||
    value === "nether" ||
    value === "end" ||
    value === "rng"
  );
}

export default AddSeedDialog;
