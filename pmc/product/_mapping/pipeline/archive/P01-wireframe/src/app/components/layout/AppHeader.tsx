import React from 'react';
import { Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ActiveTrainingIndicator } from './ActiveTrainingIndicator';
import { NotificationPanel } from './NotificationPanel';
import { CostTracker } from './CostTracker';
import type { TrainingJob, Notification, CostData, UserData } from '../../data/mockData';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  activeJobs: TrainingJob[];
  notifications: Notification[];
  costData: CostData;
  userData: UserData;
  environment?: 'development' | 'production';
  onToggleSidebar?: () => void;
  onJobClick?: (jobId: string) => void;
  onNotificationClick?: (notification: Notification) => void;
  onBreadcrumbClick?: (href: string) => void;
  onProfileClick?: () => void;
  onSignOut?: () => void;
}

export function AppHeader({
  breadcrumbs,
  activeJobs,
  notifications,
  costData,
  userData,
  environment = 'development',
  onToggleSidebar,
  onJobClick,
  onNotificationClick,
  onBreadcrumbClick,
  onProfileClick,
  onSignOut
}: AppHeaderProps) {
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-[60px] border-b border-border bg-background flex items-center justify-between px-4 gap-4">
      {/* Left Section: Mobile Menu + Breadcrumbs */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-2"
          onClick={onToggleSidebar}
        >
          <Menu className="size-5" />
        </Button>

        {/* Breadcrumbs */}
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            {breadcrumbs.flatMap((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const items = [];
              
              if (index > 0) {
                items.push(<BreadcrumbSeparator key={`sep-${index}`} />);
              }
              
              items.push(
                <BreadcrumbItem key={`item-${index}`}>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      onClick={() => crumb.href && onBreadcrumbClick?.(crumb.href)}
                      className="cursor-pointer"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );
              
              return items;
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right Section: Status Indicators + User Menu */}
      <div className="flex items-center gap-2">
        {/* Environment Badge */}
        <Badge
          variant={environment === 'production' ? 'default' : 'secondary'}
          className="hidden md:flex"
        >
          {environment === 'production' ? '🟢 Production' : '🟡 Development'}
        </Badge>

        {/* Active Training Indicator */}
        <ActiveTrainingIndicator jobs={activeJobs} onJobClick={onJobClick} />

        {/* Cost Tracker */}
        <CostTracker costData={costData} onViewDetails={() => {}} />

        {/* Notifications */}
        <NotificationPanel
          notifications={notifications}
          onNotificationClick={onNotificationClick}
        />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getUserInitials(userData.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{userData.name}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {userData.email}
                </span>
                <span className="text-xs text-muted-foreground font-normal mt-1">
                  {userData.role}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onProfileClick}>
              <User className="size-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="size-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}