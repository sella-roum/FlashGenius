import React from 'react';
import type { CardSet } from '@/types';
import { CardSetItem } from './CardSetItem';

interface CardSetListProps {
  cardSets: CardSet[];
}

export function CardSetList({ cardSets }: CardSetListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cardSets.map((set) => (
        <CardSetItem key={set.id} cardSet={set} />
      ))}
    </div>
  );
}
