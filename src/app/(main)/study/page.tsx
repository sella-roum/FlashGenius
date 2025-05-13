'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { StudySession } from '@/components/features/study/StudySession';
import { useStore } from '@/lib/store';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Wrapper component to handle Suspense for useSearchParams
function StudyPageContent() {
    const searchParams = useSearchParams();
    const cardSetIdsParam = searchParams.get('setIds');
    const { getCardSetById } = useIndexedDB();
    const { startStudySession, studyState } = useStore((state) => ({
        startStudySession: state.study.startStudySession,
        studyState: state.study,
    }));
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    useEffect(() => {
        const loadStudySession = async () => {
            setIsLoading(true);
            setError(null);
            if (!cardSetIdsParam) {
                 setError('No card set IDs provided for studying.');
                 setIsLoading(false);
                 return;
            }

            const setIds = cardSetIdsParam.split(',');
            if (setIds.length === 0) {
                 setError('Invalid card set IDs provided.');
                 setIsLoading(false);
                 return;
            }

            try {
                const setsToStudy = [];
                for (const id of setIds) {
                    const cardSet = await getCardSetById(id);
                    if (cardSet) {
                        setsToStudy.push(cardSet);
                    } else {
                        console.warn(`Card set with ID ${id} not found.`);
                        // Optionally inform the user about missing sets
                    }
                }

                if (setsToStudy.length === 0) {
                    setError('Could not find any of the specified card sets.');
                } else {
                    startStudySession(setsToStudy);
                }
            } catch (err: any) {
                console.error('Failed to load study session:', err);
                setError(err.message || 'Failed to load card sets for studying.');
            } finally {
                setIsLoading(false);
            }
        };

        loadStudySession();

        // Optional: Cleanup function if needed when component unmounts or params change
        // return () => {
        //     resetStudySession(); // Assuming you have a reset action
        // };
    }, [cardSetIdsParam, getCardSetById, startStudySession]);

    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-center pt-10">
                <LoadingSpinner size={40} />
                <p className="mt-4 text-muted-foreground">Loading study session...</p>
            </div>
        );
    }

    if (error) {
         return (
             <Alert variant="destructive" className="mt-6">
               <BookX className="h-4 w-4" />
               <AlertTitle>Error Loading Study Session</AlertTitle>
               <AlertDescription>
                 {error} Please check the URL or go back to the library.
                  <div className="mt-4">
                      <Button asChild variant="outline">
                          <Link href="/library">Go to Library</Link>
                      </Button>
                  </div>
               </AlertDescription>
             </Alert>
         );
    }

    if (!studyState.currentCard && studyState.currentDeck.length > 0 && studyState.currentCardIndex === -1) {
      // Study session completed
       return (
             <div className="text-center pt-10">
                <h2 className="text-2xl font-semibold mb-4">Session Complete!</h2>
                <p className="text-muted-foreground mb-6">You've reviewed all the cards in this session.</p>
                <div className="flex justify-center gap-4">
                   <Button variant="outline" onClick={() => startStudySession(studyState.originalDeck.length > 0 ? [{ id: studyState.activeCardSetIds[0], name: 'Restart Set', cards: studyState.originalDeck, tags: [], createdAt: new Date(), updatedAt: new Date() }] : [])}> {/* Simplified restart */}
                      Study Again
                  </Button>
                   <Button asChild>
                       <Link href="/library">Back to Library</Link>
                   </Button>
                </div>
             </div>
        );
    }

    if (!studyState.currentCard) {
        // This case might happen if the deck was empty initially
        return (
             <Alert variant="default" className="mt-6">
                 <BookX className="h-4 w-4" />
                 <AlertTitle>Empty Deck</AlertTitle>
                 <AlertDescription>
                     The selected card set(s) appear to be empty.
                      <div className="mt-4">
                         <Button asChild variant="outline">
                             <Link href="/library">Go to Library</Link>
                         </Button>
                     </div>
                 </AlertDescription>
             </Alert>
        );
    }


    return <StudySession />;
}


export default function StudyPage() {
  // Use Suspense to wait for searchParams to be available
  return (
    <div>
      <PageTitle title="Study Session" subtitle="Focus and learn your flashcards." />
      <Suspense fallback={<div className="flex justify-center pt-10"><LoadingSpinner size={40} /></div>}>
        <StudyPageContent />
      </Suspense>
    </div>
  );
}
