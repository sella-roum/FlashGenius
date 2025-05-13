'use client';

import React from 'react';
import type { Flashcard } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface GeneratedCardProps {
  index: number;
  card: Flashcard;
  onUpdate: (index: number, cardUpdate: Partial<Flashcard>) => void;
  onDelete: (index: number) => void;
}

export function GeneratedCard({ index, card, onUpdate, onDelete }: GeneratedCardProps) {
  const handleFrontChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(index, { front: e.target.value });
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(index, { back: e.target.value });
  };

  const handleDelete = () => {
    onDelete(index);
  };

  return (
    <Card className="relative">
       <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          aria-label="Delete card"
        >
          <Trash2 className="h-4 w-4" />
       </Button>
       <CardHeader className="pb-2 pt-4 pr-10"> {/* Add padding right to avoid overlap with delete button */}
           <p className="text-sm font-medium text-muted-foreground">Card {index + 1}</p>
       </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor={`card-front-${index}`} className="mb-1 block text-xs font-medium">Front</Label>
          <Textarea
            id={`card-front-${index}`}
            value={card.front}
            onChange={handleFrontChange}
            placeholder="Card front content"
            rows={3}
            className="resize-none"
          />
        </div>
        <div>
          <Label htmlFor={`card-back-${index}`} className="mb-1 block text-xs font-medium">Back</Label>
          <Textarea
            id={`card-back-${index}`}
            value={card.back}
            onChange={handleBackChange}
            placeholder="Card back content"
            rows={3}
            className="resize-none"
          />
        </div>
         {/* Add inputs for images if needed */}
      </CardContent>
    </Card>
  );
}
