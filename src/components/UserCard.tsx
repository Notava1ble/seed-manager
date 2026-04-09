import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Doc } from "../../convex/_generated/dataModel";

export function UserCard({ user }: { user: Doc<"users"> }) {
  const [showEmail, setShowEmail] = useState(false);

  const handleSignOut = () => {
    // your sign-out logic here
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {user?.name} ({showEmail ? user?.email : "••••••••••••"})
        </CardTitle>
      </CardHeader>

      <CardFooter className="flex-col gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowEmail((prev) => !prev)}
        >
          {showEmail ? "Hide Email" : "Show Email"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  );
}
