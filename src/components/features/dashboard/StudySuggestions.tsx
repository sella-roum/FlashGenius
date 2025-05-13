import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CardSet } from '@/types';
import { ArrowRight } from 'lucide-react';

interface StudySuggestionsProps {
   cardSets?: CardSet[];
}

export function StudySuggestions({ cardSets = [] }: StudySuggestionsProps) {
   // Basic suggestion: Suggest the oldest set not studied recently (needs tracking later)
   // For now, suggest the oldest set available.
   const oldestSet = cardSets.length > 0
     ? cardSets.reduce((oldest, current) =>
         current.createdAt.getTime() < oldest.createdAt.getTime() ? current : oldest
       )
     : null;

   if (!oldestSet) {
      return (
         <Card>
            <CardHeader>
               <CardTitle>おすすめの学習</CardTitle>
               <CardDescription>学習できるセットがありません。</CardDescription>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground">
               カードセットを生成またはインポートして始めましょう。
               </p>
               <Button asChild variant="link" className="p-0 h-auto mt-2">
                   <Link href="/generate">新しいセットを生成 <ArrowRight className="ml-1 h-4 w-4"/></Link>
               </Button>
            </CardContent>
         </Card>
      );
   }


   return (
    <Card>
      <CardHeader>
        <CardTitle>学習の準備はできましたか？</CardTitle>
        <CardDescription>復習におすすめのセットはこちらです：</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
            <div>
                 <p className="font-medium">{oldestSet.name}</p>
                 <p className="text-sm text-muted-foreground">{oldestSet.cards.length} 枚のカード</p>
            </div>
            <Button asChild>
                <Link href={`/study?setIds=${oldestSet.id}`}>今すぐ学習</Link>
            </Button>
        </div>
         {/* Add more suggestions based on SRS logic later */}
      </CardContent>
    </Card>
  );
}
