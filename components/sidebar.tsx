import Link from "next/link";
import { LayoutDashboard, BookOpen, PenTool, FileText, Settings, LogOut } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-card hidden md:block shrink-0">
      <div className="h-full flex flex-col pt-6 pb-4">
        <div className="px-4 mb-6">
          <h2 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">Menu</h2>
          <nav className="space-y-1">
            <NavItem icon={<LayoutDashboard className="w-5 h-5" />} label="Overview" href="/dashboard" active />
            <NavItem icon={<PenTool className="w-5 h-5" />} label="Practice" href="/practice" />
            <NavItem icon={<FileText className="w-5 h-5" />} label="Mock Tests" href="/mock-tests" />
            <NavItem icon={<BookOpen className="w-5 h-5" />} label="My Notes" href="/notes" />
          </nav>
        </div>
        
        <div className="px-4 mt-auto">
          <nav className="space-y-1 border-t pt-4">
            <NavItem icon={<Settings className="w-5 h-5" />} label="Settings" href="#" />
            <NavItem icon={<LogOut className="w-5 h-5" />} label="Log out" href="#" variant="destructive" />
          </nav>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, href, active, variant = 'default' }: { icon: React.ReactNode, label: string, href: string, active?: boolean, variant?: 'default' | 'destructive' }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-primary/10 text-primary' 
          : variant === 'destructive'
            ? 'text-destructive hover:bg-destructive/10'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
