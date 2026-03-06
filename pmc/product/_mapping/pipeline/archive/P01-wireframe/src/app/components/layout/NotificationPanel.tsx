import React, { useState } from 'react';
import { Bell, Check, X, CircleAlert, CircleCheck, TriangleAlert, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../ui/utils';
import type { Notification } from '../../data/mockData';
import { formatTimeAgo } from '../../data/mockData';

interface NotificationPanelProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  onDismiss?: (notificationId: string) => void;
}

export function NotificationPanel({ 
  notifications, 
  onNotificationClick,
  onMarkAllRead,
  onDismiss
}: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CircleCheck className="size-5 text-green-500" />;
      case 'error':
        return <CircleAlert className="size-5 text-red-500" />;
      case 'warning':
        return <TriangleAlert className="size-5 text-amber-500" />;
      case 'info':
        return <Info className="size-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-xs"
            variant="destructive"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full right-0 mt-2 w-[420px] bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-medium">Notifications</h3>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAllRead?.()}
                  className="text-xs"
                >
                  <Check className="size-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="size-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 border-b border-border last:border-b-0 hover:bg-accent transition-colors relative",
                        !notification.read && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium">
                              {notification.title}
                            </h4>
                            <button
                              onClick={() => onDismiss?.(notification.id)}
                              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                            
                            {notification.actionUrl && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => {
                                  onNotificationClick?.(notification);
                                  setIsOpen(false);
                                }}
                              >
                                {notification.actionLabel || 'View'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!notification.read && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}