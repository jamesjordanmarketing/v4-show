import React, { useState, ReactNode } from 'react';
import { AppSidebar, NavSection } from './AppSidebar';
import { AppHeader, BreadcrumbItem } from './AppHeader';
import { MobileSidebar } from './MobileSidebar';
import type { TrainingJob, Notification, CostData, UserData } from '../../data/mockData';

interface DashboardLayoutProps {
  children: ReactNode;
  activeSection: NavSection;
  breadcrumbs: BreadcrumbItem[];
  activeJobs: TrainingJob[];
  notifications: Notification[];
  costData: CostData;
  userData: UserData;
  environment?: 'development' | 'production';
  onNavigate: (section: NavSection) => void;
  onJobClick?: (jobId: string) => void;
  onNotificationClick?: (notification: Notification) => void;
}

export function DashboardLayout({
  children,
  activeSection,
  breadcrumbs,
  activeJobs,
  notifications,
  costData,
  userData,
  environment = 'development',
  onNavigate,
  onJobClick,
  onNotificationClick
}: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          activeSection={activeSection}
          onNavigate={onNavigate}
          collapsed={isDesktopSidebarCollapsed}
          activeJobCount={activeJobs.length}
        />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeSection={activeSection}
        onNavigate={onNavigate}
        activeJobCount={activeJobs.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AppHeader
          breadcrumbs={breadcrumbs}
          activeJobs={activeJobs}
          notifications={notifications}
          costData={costData}
          userData={userData}
          environment={environment}
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          onJobClick={onJobClick}
          onNotificationClick={onNotificationClick}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
