import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Navigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/button";

export function LoginPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn } = useAuthActions();

  if (isLoading || (isAuthenticated && user === undefined)) {
    return <AuthScreen label="Checking session" />;
  }

  if (isAuthenticated && user?.status === "pending") {
    return <Navigate replace to="/pending" />;
  }

  if (isAuthenticated && user?.status === "active") {
    return <Navigate replace to="/app" />;
  }

  return (
    <AuthScreen
      action={
        <Button
          className="self-center"
          onClick={() => void signIn("github")}
          size={"lg"}
        >
          {" "}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              fill="currentColor"
            />
          </svg>
          Log in with GitHub
        </Button>
      }
      description="Sign in to github to access app."
      title="Seed Manager"
    />
  );
}

function AuthScreen({
  action,
  description,
  label,
  title,
}: {
  action?: React.ReactNode;
  description?: string;
  label?: string;
  title?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold">{title ?? label}</h1>
        <p className="text-sm text-muted-foreground">
          {description ?? label ?? "Loading"}
        </p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
