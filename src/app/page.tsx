import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRedirectForRole } from "@/lib/auth-helpers";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user || !user.role) {
    redirect("/login");
  }

  const destination = getDefaultRedirectForRole(user.role);
  redirect(destination);
}
