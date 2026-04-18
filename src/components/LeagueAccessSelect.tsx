import {
  Field,
  FieldDescription,
  FieldLabel,
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
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
  EMPTY_LEAGUE_VALUE,
  getLeagueLabel,
} from "@/lib/userAccess";

export function LeagueAccessSelect({
  description,
  disabled = false,
  id,
  label,
  leagues,
  onValueChange,
  value,
}: {
  description: string;
  disabled?: boolean;
  id: string;
  label: string;
  leagues: Doc<"leagues">[];
  onValueChange: (leagueId: Id<"leagues"> | null) => void;
  value: Id<"leagues"> | null;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        disabled={disabled}
        itemToStringLabel={(leagueId) => getLeagueLabel(leagues, leagueId)}
        onValueChange={onValueChange}
        value={value}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="No league" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{label}</SelectLabel>
            <SelectItem value={EMPTY_LEAGUE_VALUE}>No league</SelectItem>
            {leagues.map((league) => (
              <SelectItem key={league._id} value={league._id}>
                {league.leagueName}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}
