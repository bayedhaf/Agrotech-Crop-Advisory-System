"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell, Home, Camera, History, Settings } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { cn } from "@/lib/utils";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const displayName = user?.displayName || user?.email || "Profile";
  const initials = (user?.displayName || user?.email || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navItems = [
    { name: "Fields", href: "/dashboard", icon: Home },
    { name: "Scan", href: "/dashboard/scan", icon: Camera },
    { name: "History", href: "/dashboard/history", icon: History },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#131313] border-b border-[#41493e] flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md text-[#c0c9bb] hover:bg-[#1c1b1b] hover:text-[#91d78a]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#1b5e20]/25 text-[#91d78a]"
                  : "text-[#c0c9bb] hover:bg-[#1c1b1b] hover:text-[#e5e2e1]"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 ml-auto">
        <button className="relative p-2 rounded-full text-[#c0c9bb] hover:bg-[#1c1b1b] hover:text-[#91d78a]">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#91d78a]"></span>
        </button>
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-[#1c1b1b] transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-[#1b5e20] flex items-center justify-center text-[#e5e2e1] text-sm font-medium">
            {initials}
          </div>
          <span className="text-sm font-medium text-[#c0c9bb] hidden sm:inline-block">
            {displayName}
          </span>
        </Link>
      </div>
    </header>
  );
}