import { redirect } from "next/navigation";
import { hasValidSession, safeNextPath } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage({
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
      <LoginForm next={next ?? "/"} />
    </div>
  );
}
