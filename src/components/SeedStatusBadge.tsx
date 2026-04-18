import { Badge } from "@/components/ui/badge";
import type { SeedStatus } from "@/lib/seedStatus";

export function SeedStatusBadge({ status }: { status: SeedStatus }) {
  if (status === "used") {
    return <Badge variant="outline">Used</Badge>;
  }

  if (status === "open") {
    return <Badge variant="outline">Open</Badge>;
  }

  if (status === "assigned") {
    return <Badge variant="secondary">Assigned</Badge>;
  }

  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }

  if (status === "claimed") {
    return <Badge variant="outline">Claimed</Badge>;
  }

  return <Badge variant="outline">Unassigned</Badge>;
}
