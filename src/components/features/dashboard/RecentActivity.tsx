import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CardSet } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';

interface RecentActivityProps {
  cardSets?: CardSet[];
}

export function RecentActivity({ cardSets = [] }: RecentActivityProps) {
  // Sort by creation date descending and take top 5
  const recentSets = cardSets
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  if (recentSets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>No recent card sets generated yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Generate your first card set to see it here!
          </p>
           <Button asChild variant="link" className="p-0 h-auto mt-2">
               <Link href="/generate">Generate New Set <ArrowRight className="ml-1 h-4 w-4"/></Link>
           </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Generated Sets</CardTitle>
        <CardDescription>Your latest flashcard creations.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {recentSets.map((set) => (
            <li key={set.id} className="flex items-center justify-between gap-4">
              <div>
                <Link href={`/library?focus=${set.id}`} className="font-medium hover:underline">
                  {set.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {set.cards.length} cards • Created {formatDistanceToNow(new Date(set.createdAt), { addSuffix: true })}
                </p>
              </div>
               <Button asChild variant="outline" size="sm">
                    {/* Link to study session for this specific set */}
                    <Link href={`/study?setIds=${set.id}`}>Study</Link>
               </Button>
            </li>
          ))}
        </ul>
         {cardSets.length > 5 && (
             <Button asChild variant="link" className="p-0 h-auto mt-4">
                 <Link href="/library">View All Sets <ArrowRight className="ml-1 h-4 w-4"/></Link>
             </Button>
         )}
      </CardContent>
    </Card>
  );
}
