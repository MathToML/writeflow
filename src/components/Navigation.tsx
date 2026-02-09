"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tasks", label: "Tasks" },
  { href: "/expenses", label: "Expenses" },
  { href: "/habits", label: "Habits" },
  { href: "/history", label: "History" },
];

export default function Navigation({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/" className="font-bold text-slate-900 mr-4 shrink-0">
            OTTD
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                pathname === item.href
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {userName && (
            <span className="text-sm text-slate-500 whitespace-nowrap">{userName}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
