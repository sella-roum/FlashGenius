'use client';

import React, { useEffect } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { CardSetList } from '@/components/features/library/CardSetList';
import { FilterControls } from '@/components/features/library/FilterControls';
import { useStore } from '@/lib/store';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';

export default function LibraryPage() {
  const { allCardSets: dbAllCardSets, availableThemes: dbAvailableThemes, availableTags: dbAvailableTags, isLoading: isDbLoading } = useIndexedDB();
  const {
      filteredCardSets,
      setAllCardSets,
      setAvailableThemes,
      setAvailableTags,
      libraryLoading,
      // Removed current... from here as useEffect relies on store setter guards
  } = useStore((state) => ({
      filteredCardSets: state.library.filteredCardSets,
      setAllCardSets: state.library.setAllCardSets,
      setAvailableThemes: state.library.setAvailableThemes,
      setAvailableTags: state.library.setAvailableTags,
      libraryLoading: state.library.isLoading,
      // currentAllCardSets: state.library.allCardSets, // Not strictly needed if useEffect doesn't compare before set
      // currentAvailableThemes: state.library.availableThemes,
      // currentAvailableTags: state.library.availableTags,
  }));

   const isLoading = isDbLoading || libraryLoading;

   useEffect(() => {
     if (!isDbLoading) {
       // Store setters now have internal guards
       setAllCardSets(dbAllCardSets ?? []);
       setAvailableThemes(dbAvailableThemes ?? []);
       setAvailableTags(dbAvailableTags ?? []);
     }
   // Dependencies:
   // - isDbLoading: Triggers effect when loading state changes.
   // - dbAllCardSets, dbAvailableThemes, dbAvailableTags: Data from IndexedDB. Effect runs if these change.
   // - Setters (setAllCardSets, etc.): Stable functions from Zustand, included for exhaustiveness/linting.
   }, [isDbLoading, dbAllCardSets, dbAvailableThemes, dbAvailableTags, setAllCardSets, setAvailableThemes, setAvailableTags]);


  return (
    <div>
      <PageTitle title="カードライブラリ" subtitle="フラッシュカードセットを閲覧、管理、学習します。" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">フィルター</h2>
           {isLoading ? (
               <div className="space-y-4">
                   <Skeleton className="h-8 w-full" />
                   <Skeleton className="h-24 w-full" />
                   <Skeleton className="h-24 w-full" />
               </div>
           ) : (
               <FilterControls />
           )}
        </div>

        <div className="md:col-span-3">
           <h2 className="mb-4 text-lg font-semibold">
                {isLoading ? '読み込み中...' : `${filteredCardSets.length} 件のカードセットが見つかりました`}
           </h2>
           {isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                     <Skeleton className="h-32 w-full rounded-lg" />
                     <Skeleton className="h-32 w-full rounded-lg" />
                     <Skeleton className="h-32 w-full rounded-lg" />
                </div>
           ) : filteredCardSets.length > 0 ? (
                <CardSetList cardSets={filteredCardSets} />
           ) : (
               <Alert>
                 <Info className="h-4 w-4" />
                 <AlertTitle>カードセットが見つかりません</AlertTitle>
                 <AlertDescription>
                    現在のフィルターに一致するカードセットがないか、ライブラリが空です。新しいカードを生成してみてください！
                 </AlertDescription>
               </Alert>
           )}
        </div>
      </div>
    </div>
  );
}
