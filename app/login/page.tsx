import { redirect } from "next/navigation";
import { hasValidSession, safeNextPath } from "@/lib/auth/session";
import { isGoogleAuthEnabled } from "@/lib/auth/google";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  if (await hasValidSession()) {
    redirect(safeNextPath(next ?? "/"));
  }

  const googleEnabled = isGoogleAuthEnabled();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <LoginForm next={next ?? "/"} error={error} googleEnabled={googleEnabled} />
    </div>
  );
}
