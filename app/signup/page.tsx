import { redirect } from "next/navigation";
import { hasValidSession, safeNextPath } from "@/lib/auth/session";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if (await hasValidSession()) {
    redirect(safeNextPath(next ?? "/"));
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <SignupForm next={next ?? "/"} />
    </div>
  );
}
