'use client';

import React from 'react';
import Link from 'next/link';
import type { CardSet } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CalendarDays, Edit, Tag as TagIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CardSetItemProps {
  cardSet: CardSet;
}

export function CardSetItem({ cardSet }: CardSetItemProps) {
    const { deleteCardSet } = useIndexedDB();
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deleteCardSet(cardSet.id);
            toast({ title: "Success", description: `Card set "${cardSet.name}" deleted.` });
            // Zustand store managing library list will update via useLiveQuery
        } catch (error: any) {
            console.error("Failed to delete card set:", error);
            toast({ variant: "destructive", title: "Error", description: `Failed to delete card set: ${error.message}` });
        }
    };


  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-lg">{cardSet.name}</CardTitle>
        <CardDescription>
          {cardSet.cards.length} card{cardSet.cards.length !== 1 ? 's' : ''}
          {cardSet.theme && ` • ${cardSet.theme}`}
        </CardDescription>
         <div className="flex items-center text-xs text-muted-foreground pt-1">
            <CalendarDays className="mr-1 h-3 w-3" />
            Created: {format(new Date(cardSet.createdAt), 'MMM d, yyyy')}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {cardSet.tags && cardSet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
             <TagIcon className="h-4 w-4 text-muted-foreground mr-1 mt-0.5"/>
            {cardSet.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}
        {/* Add description preview if available */}
         {/* {cardSet.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{cardSet.description}</p>} */}
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-4 border-t">
         <Button asChild size="sm">
            <Link href={`/study?setIds=${cardSet.id}`} aria-label={`Study ${cardSet.name}`}>
                <BookOpen className="mr-2 h-4 w-4" /> Study
            </Link>
         </Button>
         <div className="flex gap-1">
             {/* Edit Button (links to generate page with pre-filled data?) */}
             {/* <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/generate?edit=${cardSet.id}`} aria-label={`Edit ${cardSet.name}`}>
                     <Edit className="h-4 w-4" />
                </Link>
             </Button> */}
             <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label={`Delete ${cardSet.name}`}>
                         <Trash2 className="h-4 w-4" />
                     </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the card set
                        "{cardSet.name}" and all its cards.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

         </div>
      </CardFooter>
    </Card>
  );
}
