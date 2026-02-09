"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Consistent stroke-style icons (Lucide-inspired, 18x18)
const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  tasks: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  expenses: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  habits: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/expenses", label: "Expenses", icon: "expenses" },
  { href: "/habits", label: "Habits", icon: "habits" },
  { href: "/history", label: "History", icon: "history" },
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
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-1">
        <Link href="/" className="font-bold text-slate-900 mr-3 shrink-0">
          OTTD
        </Link>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap shrink-0 transition-all ${
              pathname === item.href
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {ICONS[item.icon]}
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
        <div className="ml-auto" />
        {userName && (
          <span className="text-sm text-slate-500 whitespace-nowrap shrink-0 nav-label">{userName}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
