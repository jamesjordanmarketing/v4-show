'use client';

import { Suspense } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useWorkbase } from '@/hooks/useWorkbases';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Rocket,
  MessagesSquare,
  FileText,
  MessageCircle,
  BarChart3,
  Settings,
  ChevronLeft,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function WorkbaseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const workbaseId = params.id as string;
  const { data: workbase, isLoading } = useWorkbase(workbaseId);

  const basePath = `/workbase/${workbaseId}`;

  const navSections: NavSection[] = [
    {
      title: '',
      items: [
        { label: 'Overview', href: basePath, icon: LayoutDashboard },
      ],
    },
    {
      title: 'FINE TUNING',
      items: [
        { label: 'Conversations', href: `${basePath}/fine-tuning/conversations`, icon: MessageSquare },
        { label: 'Launch Tuning', href: `${basePath}/fine-tuning/launch`, icon: Rocket },
        { label: 'Behavior Chat', href: `${basePath}/fine-tuning/chat`, icon: MessagesSquare },
      ],
    },
    {
      title: 'FACT TRAINING',
      items: [
        { label: 'Documents', href: `${basePath}/fact-training/documents`, icon: FileText },
        { label: 'Chat', href: `${basePath}/fact-training/chat`, icon: MessageCircle },
        { label: 'Quality', href: `${basePath}/fact-training/quality`, icon: BarChart3 },
      ],
    },
    {
      title: '',
      items: [
        { label: 'Settings', href: `${basePath}/settings`, icon: Settings },
      ],
    },
  ];

  function isActive(href: string): boolean {
    if (href === basePath) return pathname === basePath;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="px-4 pt-4 pb-2">
          <Link href="/home">
            <img
              src="/bright-run-logo.png"
              alt="Bright Run"
              className="h-7 w-auto"
            />
          </Link>
        </div>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <Link href="/home" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-2">
            <ChevronLeft className="h-4 w-4" />
            All Work Bases
          </Link>
          <h2 className="font-semibold text-foreground truncate">
            {isLoading ? '...' : workbase?.name || 'Work Base'}
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="mb-2">
              {section.title && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-duck-blue text-white font-medium'
                        : 'text-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-duck-blue" />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
