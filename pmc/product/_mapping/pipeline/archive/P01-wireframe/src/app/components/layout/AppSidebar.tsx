import React from 'react';
import { LayoutDashboard, Database, Rocket, Brain, Settings } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';

export type NavSection = 'dashboard' | 'datasets' | 'training' | 'models' | 'settings';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface AppSidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  collapsed?: boolean;
  activeJobCount?: number;
}

export function AppSidebar({ 
  activeSection, 
  onNavigate, 
  collapsed = false,
  activeJobCount = 0 
}: AppSidebarProps) {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="size-5" />
    },
    {
      id: 'datasets',
      label: 'Datasets',
      icon: <Database className="size-5" />
    },
    {
      id: 'training',
      label: 'Training Jobs',
      icon: <Rocket className="size-5" />,
      badge: activeJobCount > 0 ? `${activeJobCount} active` : undefined
    },
    {
      id: 'models',
      label: 'Models',
      icon: <Brain className="size-5" />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="size-5" />
    }
  ];

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Logo Area */}
      <div className="h-[80px] flex items-center px-4 border-b border-sidebar-border">
        {collapsed ? (
          <div className="flex items-center justify-center w-full">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground">BR</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground">BR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sidebar-foreground">BrightRun</span>
              <span className="text-xs text-muted-foreground">LoRA Pipeline</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r" />
                  )}
                  
                  <span className={cn("flex-shrink-0", isActive && "text-sidebar-primary")}>
                    {item.icon}
                  </span>
                  
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Connection Status */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span>RunPod Connected</span>
          </div>
        </div>
      )}
    </aside>
  );
}
