import { verifySession, getCurrentUser } from "@/lib/dal";
import { Nav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await verifySession();
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav userEmail={user?.email ?? ""} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
