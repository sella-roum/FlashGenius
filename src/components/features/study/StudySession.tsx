'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { StudyCard } from './StudyCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function StudySession() {
  const {
    currentCard,
    currentCardIndex,
    currentDeck,
    nextCard,
    previousCard, // Make sure this is implemented in the store if used
    shuffleDeck, // Make sure this is implemented
  } = useStore((state) => ({
    currentCard: state.study.currentCard,
    currentCardIndex: state.study.currentCardIndex,
    currentDeck: state.study.currentDeck,
    nextCard: state.study.nextCard,
    previousCard: state.study.previousCard,
    shuffleDeck: state.study.shuffleDeck,
  }));

  const deckSize = currentDeck.length;
  const progressValue = deckSize > 0 ? ((currentCardIndex + 1) / deckSize) * 100 : 0;


  if (!currentCard) {
    // This case is handled in the page.tsx, but added as a safeguard
    return <div className="text-center mt-10">カードを読み込み中またはセッション終了...</div>;
  }


  return (
    <div className="flex flex-col items-center">
       {/* Progress Bar */}
       <div className="w-full max-w-2xl mb-4 px-4">
           <Progress value={progressValue} className="w-full h-2" />
           <p className="text-sm text-muted-foreground text-center mt-1">
                カード {currentCardIndex + 1} / {deckSize}
            </p>
       </div>

      {/* Study Card */}
      <div className="w-full max-w-2xl mb-6">
         <StudyCard card={currentCard} />
      </div>

      {/* Navigation Controls */}
      <div className="flex w-full max-w-2xl justify-between items-center px-4">
         <Button
            variant="outline"
            onClick={previousCard}
            disabled={currentCardIndex <= 0}
            aria-label="前のカード"
        >
           <ChevronLeft className="h-5 w-5" />
           <span className="ml-2 hidden sm:inline">前へ</span>
         </Button>

          <Button
             variant="outline"
             onClick={shuffleDeck}
             aria-label="デッキをシャッフル"
             title="デッキをシャッフル"
         >
            <RotateCcw className="h-5 w-5"/>
         </Button>

        <Button
            variant="default" // Changed to default for primary action
            onClick={nextCard}
            disabled={currentCardIndex >= deckSize - 1}
            aria-label="次のカード"
        >
          <span className="mr-2 hidden sm:inline">次へ</span>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
