// src/components/shared/Header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Boxes, LayoutDashboard, PlusSquare } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: '生成', href: '/generate', icon: PlusSquare },
  { name: 'ライブラリ', href: '/library', icon: Boxes },
  // { name: '学習', href: '/study', icon: BookOpen }, // Removed study link
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex items-center gap-2">
        {/* Replace with SVG logo if available */}
        <span className="text-lg font-semibold">FlashGenius</span>
      </div>
      <nav className="ml-auto flex items-center gap-2">
        <TooltipProvider>
          {navigation.map((item) => (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="sm" // Adjusted size to 'sm' to better fit text + icon
                  className={cn(
                    'rounded-lg px-3 py-2', // Adjusted padding
                    pathname === item.href
                      ? 'bg-muted text-primary'
                      : 'text-muted-foreground'
                  )}
                  aria-label={item.name}
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    <span className="hidden sm:inline">{item.name}</span> {/* Show text on sm screens and up */}
                    <span className="sm:hidden">{item.name}</span> {/* Tooltip will show on very small screens */}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden"> {/* Tooltip only for very small screens */}
                {item.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
      {/* Add User profile/logout button here later */}
    </header>
  );
}
