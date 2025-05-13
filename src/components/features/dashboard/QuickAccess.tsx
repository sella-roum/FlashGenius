import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Boxes, PlusSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function QuickAccess() {
  return (
    <Card>
        <CardContent className="pt-6">
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Button asChild variant="outline" size="lg" className="justify-start gap-3 h-auto py-4">
                    <Link href="/generate">
                        <PlusSquare className="h-5 w-5" />
                         <div>
                             <p className="font-semibold">Generate New Set</p>
                             <p className="text-sm text-muted-foreground text-left">Create cards from text, URL, or file.</p>
                         </div>
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="justify-start gap-3 h-auto py-4">
                    <Link href="/library">
                        <Boxes className="h-5 w-5" />
                         <div>
                             <p className="font-semibold">Browse Library</p>
                             <p className="text-sm text-muted-foreground text-left">View and manage your card sets.</p>
                         </div>
                    </Link>
                </Button>
             </div>
        </CardContent>
    </Card>
  );
}
