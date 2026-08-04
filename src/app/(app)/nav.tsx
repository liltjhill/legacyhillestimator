"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const LINKS = [
  { href: "/", label: "Jobs" },
  { href: "/price-list", label: "Price List" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Legacy Hill Estimator
          </span>
          <nav className="flex gap-4">
            {LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm ${
                    active
                      ? "font-medium text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{userEmail}</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
