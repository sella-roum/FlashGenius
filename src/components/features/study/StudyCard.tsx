// src/components/features/study/StudyCard.tsx
'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Flashcard } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Lightbulb, Info, EyeOff } from 'lucide-react';
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
    hideHint, // New action
    currentDetails,
    isDetailsLoading,
    fetchDetails,
    hideDetails, // New action
    error,
  } = useStore((state) => ({
    isFrontVisible: state.study.isFrontVisible,
    flipCard: state.study.flipCard,
    currentHint: state.study.currentHint,
    isHintLoading: state.study.isHintLoading,
    fetchHint: state.study.fetchHint,
    hideHint: state.study.hideHint, // Get new action
    currentDetails: state.study.currentDetails,
    isDetailsLoading: state.study.isDetailsLoading,
    fetchDetails: state.study.fetchDetails,
    hideDetails: state.study.hideDetails, // Get new action
    error: state.study.error,
  }));

  const handleFetchHint = () => {
    fetchHint(!!currentHint); // Pass true to forceRegenerate if hint already exists
  };

  const handleFetchDetails = () => {
    fetchDetails(!!currentDetails); // Pass true to forceRegenerate if details already exist
  };

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
          {/* Hint and Details Section */}
          <div className="w-full space-y-3">
            {isFrontVisible && (
              <div>
                <Button variant="outline" size="sm" onClick={handleFetchHint} disabled={isHintLoading} className="w-full justify-start">
                  {isHintLoading ? (
                      <LoadingSpinner size={16} className="mr-2" />
                  ) : (
                      <Lightbulb className="mr-2 h-4 w-4" />
                  )}
                  {currentHint && !isHintLoading ? 'ヒントを再生成' : 'ヒントを表示'}
                </Button>
                {currentHint && (
                    <div className="mt-2 space-y-2">
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">{currentHint}</p>
                        <Button variant="ghost" size="sm" onClick={hideHint} className="w-full justify-start text-xs">
                           <EyeOff className="mr-2 h-3 w-3" />
                           ヒントを隠す
                        </Button>
                    </div>
                )}
              </div>
            )}

            {!isFrontVisible && (
              <div>
                <Button variant="outline" size="sm" onClick={handleFetchDetails} disabled={isDetailsLoading} className="w-full justify-start">
                  {isDetailsLoading ? (
                      <LoadingSpinner size={16} className="mr-2" />
                  ) : (
                      <Info className="mr-2 h-4 w-4" />
                  )}
                  {currentDetails && !isDetailsLoading ? '詳細を再生成' : '詳細を表示'}
                </Button>
                {currentDetails && (
                    <div className="mt-2 space-y-2">
                        <ScrollArea className="h-[150px] w-full rounded-md border p-3 bg-muted">
                          <ReactMarkdown
                              className="prose prose-sm dark:prose-invert max-w-none"
                              components={{
                                  // a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
                              }}
                          >
                            {currentDetails}
                          </ReactMarkdown>
                        </ScrollArea>
                         <Button variant="ghost" size="sm" onClick={hideDetails} className="w-full justify-start text-xs">
                            <EyeOff className="mr-2 h-3 w-3" />
                            詳細を隠す
                         </Button>
                    </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
            <Separator/>
          </div>

          {/* Flip Button */}
           <Button onClick={flipCard} className="w-full" variant={"default"}> {/* Always default variant */}
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 lucide lucide-file-diff"><path d="M14 2v6h6"/><path d="M10 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L14 2Z"/><path d="M8 18v-2c0-1.1.9-2 2-2h4"/><path d="M12 12h4"/></svg>
             {isFrontVisible ? '裏を見る' : '表を見る'}
           </Button>
      </CardFooter>
    </Card>
  );
}
