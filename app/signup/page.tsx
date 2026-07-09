import { redirect } from "next/navigation";
import { hasValidSession, safeNextPath } from "@/lib/auth/session";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  if (await hasValidSession()) {
    redirect(safeNextPath(next ?? "/"));
  }

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <SignupForm next={next ?? "/"} error={error} googleEnabled={googleEnabled} />
    </div>
  );
}
