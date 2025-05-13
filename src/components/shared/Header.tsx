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
  { name: '学習', href: '/study', icon: BookOpen }, // Link might need adjustment based on study flow
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
                  size="icon"
                  className={cn(
                    'rounded-lg',
                    pathname === item.href
                      ? 'bg-muted text-primary'
                      : 'text-muted-foreground'
                  )}
                  aria-label={item.name}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
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
