"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, Menu, UserCircle, LogOut, Clock } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/context/AuthContext";

function NavbarClock() {
  const [time, setTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return <div className="hidden lg:block w-28 h-8 animate-pulse bg-muted rounded-md border border-border shrink-0"></div>;
  }

  return (
    <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border border-border shrink-0">
      <Clock className="w-4 h-4" />
      {time.toLocaleTimeString()}
    </div>
  );
}

export function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  
  // Hide Navbar when taking a test or viewing full screen analysis
  if (pathname?.startsWith('/mock-tests/') && pathname !== '/mock-tests') {
     return null;
  }
  
  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Star className="h-5 w-5 text-white fill-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SarkariStaar</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
            <Link href="/mock-tests" className="text-sm font-medium hover:text-primary transition-colors">Mock Tests</Link>
            <Link href="/practice" className="text-sm font-medium hover:text-primary transition-colors">Practice</Link>
            <Link href="/vocab-grammar" className="text-sm font-medium hover:text-secondary transition-colors relative">
              Vocab & Grammar
              <span className="absolute -top-2 -right-3 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
              </span>
            </Link>
            <Link href="/notes" className="text-sm font-medium hover:text-primary transition-colors">Notes</Link>
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm font-bold text-amber-500 hover:text-amber-600 transition-colors bg-amber-500/10 px-3 py-1 rounded-full">
                Admin Area
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <NavbarClock />
            <ThemeToggle />
            {user ? (
              <div className="relative group hidden md:block z-50">
                <button className="flex items-center gap-2 rounded-md hover:bg-muted p-1 pr-3 border border-transparent hover:border-border transition-all">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold truncate max-w-[120px]">
                    {user.displayName || "My Profile"}
                  </span>
                </button>
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden py-1">
                    <div className="px-4 py-3 border-b border-border/50">
                      <p className="text-sm font-medium truncate">{user.displayName || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">
                      My Dashboard
                    </Link>
                    <button 
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/login" className="hidden md:inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
                Login
              </Link>
            )}
            <button className="md:hidden p-2 text-foreground">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
