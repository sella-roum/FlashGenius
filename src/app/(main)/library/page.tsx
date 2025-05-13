'use client';

import React, { useEffect } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { CardSetList } from '@/components/features/library/CardSetList';
import { FilterControls } from '@/components/features/library/FilterControls';
import { useStore } from '@/lib/store';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';

export default function LibraryPage() {
  const { allCardSets, availableThemes, availableTags } = useIndexedDB();
  const {
      filteredCardSets,
      setAllCardSets,
      setAvailableThemes,
      setAvailableTags
  } = useStore((state) => ({
      filteredCardSets: state.library.filteredCardSets,
      setAllCardSets: state.library.setAllCardSets,
      setAvailableThemes: state.library.setAvailableThemes,
      setAvailableTags: state.library.setAvailableTags,
  }));

   // Check if the initial data load from IndexedDB is complete
   const isLoading = allCardSets === undefined || availableThemes === undefined || availableTags === undefined;


   // Effect to load data from IndexedDB hook into Zustand store
   useEffect(() => {
     if (!isLoading) {
       setAllCardSets(allCardSets);
       setAvailableThemes(availableThemes);
       setAvailableTags(availableTags);
     }
     // Dependencies ensure this runs when data is loaded or changes
   }, [isLoading, allCardSets, availableThemes, availableTags, setAllCardSets, setAvailableThemes, setAvailableTags]);


  return (
    <div>
      <PageTitle title="Card Library" subtitle="Browse, manage, and study your flashcard sets." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Filters</h2>
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
                {filteredCardSets.length} Card Set{filteredCardSets.length !== 1 ? 's' : ''} Found
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
                 <AlertTitle>No Card Sets Found</AlertTitle>
                 <AlertDescription>
                    No card sets match the current filters, or your library is empty. Try generating some new cards!
                 </AlertDescription>
               </Alert>
           )}
        </div>
      </div>
    </div>
  );
}
