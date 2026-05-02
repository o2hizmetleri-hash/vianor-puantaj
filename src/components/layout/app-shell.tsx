"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: React.ReactNode;
  restaurantName?: string;
}

export function AppShell({ children, restaurantName }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 bg-grain">
        <Topbar
          restaurantName={restaurantName}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-auto p-4 md:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
