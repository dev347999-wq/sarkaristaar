"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, Menu, X, UserCircle, LogOut, Clock } from "lucide-react";
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
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  // Require a logged-in user AND a non-empty admin email to prevent
  // undefined === undefined from incorrectly returning true.
  const isAdmin = !!user && !!adminEmail && user.email === adminEmail;
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Hide Navbar when taking a test or viewing full screen analysis
  if (pathname?.startsWith('/mock-tests/') && pathname !== '/mock-tests') {
     return null;
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/mock-tests", label: "Mock Tests" },
    { href: "/practice", label: "Practice" },
    { href: "/vocab-grammar", label: "Vocab & Grammar" },
    { href: "/notes", label: "Notes" },
    { href: "/dashboard", label: "Dashboard" },
  ];
  
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
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="text-sm font-medium hover:text-primary transition-colors">
                {link.label === "Vocab & Grammar" ? (
                  <span className="relative">
                    {link.label}
                    <span className="absolute -top-2 -right-3 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                    </span>
                  </span>
                ) : link.label}
              </Link>
            ))}
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
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-foreground rounded-md hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-amber-500 hover:bg-amber-500/10 transition-colors"
              >
                Admin Area
              </Link>
            )}
          </div>

          {/* Mobile User Section */}
          <div className="px-4 pb-4 border-t border-border/50 mt-2 pt-3">
            {user ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Signed in as <span className="font-semibold text-foreground">{user.displayName || user.email}</span>
                </div>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

