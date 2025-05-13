'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Flashcard } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Lightbulb, Info, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface StudyCardProps {
  card: Flashcard;
}

export function StudyCard({ card }: StudyCardProps) {
  const {
    isFrontVisible,
    flipCard,
    currentHint,
    isHintLoading,
    fetchHint,
    currentDetails,
    isDetailsLoading,
    fetchDetails,
    error, // Get error state from store
  } = useStore((state) => ({
    isFrontVisible: state.study.isFrontVisible,
    flipCard: state.study.flipCard,
    currentHint: state.study.currentHint,
    isHintLoading: state.study.isHintLoading,
    fetchHint: state.study.fetchHint,
    currentDetails: state.study.currentDetails,
    isDetailsLoading: state.study.isDetailsLoading,
    fetchDetails: state.study.fetchDetails,
    error: state.study.error, // Get study-specific errors
  }));

  return (
    <Card className="w-full min-h-[300px] flex flex-col shadow-lg">
      {/* Card Content */}
       <CardContent className="flex-grow flex items-center justify-center p-6 text-center">
           <div className="text-xl md:text-2xl font-medium">
               {isFrontVisible ? card.front : card.back}
           </div>
      </CardContent>

      {/* Card Footer with Actions */}
      <CardFooter className="flex flex-col items-stretch gap-4 p-4 border-t">
          {/* Hint and Details Section (only visible when back is shown) */}
          {!isFrontVisible && (
               <div className="w-full space-y-3">
                   {/* Hint */}
                   <div>
                       <Button variant="outline" size="sm" onClick={fetchHint} disabled={isHintLoading || !!currentHint} className="w-full justify-start">
                           {isHintLoading ? (
                               <LoadingSpinner size={16} className="mr-2" />
                           ) : (
                               <Lightbulb className="mr-2 h-4 w-4" />
                           )}
                           {currentHint ? 'Hint:' : 'Show Hint'}
                       </Button>
                       {currentHint && (
                           <p className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">{currentHint}</p>
                       )}
                   </div>

                    {/* Details */}
                   <div>
                       <Button variant="outline" size="sm" onClick={fetchDetails} disabled={isDetailsLoading || !!currentDetails} className="w-full justify-start">
                            {isDetailsLoading ? (
                               <LoadingSpinner size={16} className="mr-2" />
                           ) : (
                               <Info className="mr-2 h-4 w-4" />
                           )}
                           {currentDetails ? 'Details:' : 'Show Details'}
                       </Button>
                        {currentDetails && (
                             <ScrollArea className="mt-2 h-[150px] w-full rounded-md border p-3 bg-muted"> {/* Scrollable details */}
                                <ReactMarkdown
                                     className="prose prose-sm dark:prose-invert max-w-none"
                                     components={{ // Add styling for markdown elements if needed
                                        // Example: Customize links
                                        // a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
                                    }}
                                >
                                   {currentDetails}
                                </ReactMarkdown>
                             </ScrollArea>
                        )}
                   </div>
                   {error && ( // Display fetch errors for hint/details
                        <p className="text-xs text-destructive text-center">{error}</p>
                    )}

                   <Separator/>
               </div>
          )}


          {/* Flip Button */}
           <Button onClick={flipCard} className="w-full" variant={isFrontVisible ? "secondary" : "default"}>
             <RefreshCw className="mr-2 h-4 w-4" />
             {isFrontVisible ? 'Reveal Answer' : 'Show Question'}
           </Button>
      </CardFooter>
    </Card>
  );
}
