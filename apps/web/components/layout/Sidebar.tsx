"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sprout,
  CloudRain,
  History,
  Settings,
  LogOut,
  User,
  Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Crop Diagnosis", href: "/dashboard/scan", icon: Sprout },
 
  { name: "History", href: "/dashboard/history", icon: History },
  { name: "Settings", href: "/dashboard/profile", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("agri_token");
    sessionStorage.removeItem("agri_token");
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-[#131313] border-r border-[#41493e] transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 px-4 border-b border-[#41493e]">
            <div className="w-7 h-7 rounded-lg bg-[#1b5e20] flex items-center justify-center">
              <Leaf className="w-4 h-4 text-[#91d78a]" />
            </div>
            <span className="font-semibold text-[#e5e2e1] text-base">AgriSense</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={`${item.name}-${item.href}`}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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

          {/* Footer */}
          <div className="border-t border-[#41493e] p-3 space-y-2">
            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#c0c9bb] hover:bg-[#1c1b1b] hover:text-[#91d78a] transition-colors"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#ffb4ab] hover:bg-[#2a1a1a] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}