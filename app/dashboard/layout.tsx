import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-muted/10">
        {children}
      </div>
    </div>
  );
}
