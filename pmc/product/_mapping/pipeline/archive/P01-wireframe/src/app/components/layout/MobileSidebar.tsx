import React from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { AppSidebar, NavSection } from './AppSidebar';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  activeJobCount?: number;
}

export function MobileSidebar({
  isOpen,
  onClose,
  activeSection,
  onNavigate,
  activeJobCount = 0
}: MobileSidebarProps) {
  const handleNavigate = (section: NavSection) => {
    onNavigate(section);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="p-0 w-[240px]">
        <AppSidebar
          activeSection={activeSection}
          onNavigate={handleNavigate}
          activeJobCount={activeJobCount}
        />
      </SheetContent>
    </Sheet>
  );
}
