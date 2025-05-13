'use client';

import React, { useEffect } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { RecentActivity } from '@/components/features/dashboard/RecentActivity';
import { StudySuggestions } from '@/components/features/dashboard/StudySuggestions';
import { QuickAccess } from '@/components/features/dashboard/QuickAccess';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { useStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { allCardSets: dbAllCardSets, availableThemes: dbAvailableThemes, availableTags: dbAvailableTags, isLoading: isDbLoading } = useIndexedDB();
  const {
      setAllCardSets,
      setAvailableThemes,
      setAvailableTags,
      libraryLoading,
      currentAllCardSets,
      currentAvailableThemes,
      currentAvailableTags,
  } = useStore((state) => ({
      setAllCardSets: state.library.setAllCardSets,
      setAvailableThemes: state.library.setAvailableThemes,
      setAvailableTags: state.library.setAvailableTags,
      libraryLoading: state.library.isLoading,
      currentAllCardSets: state.library.allCardSets,
      currentAvailableThemes: state.library.availableThemes,
      currentAvailableTags: state.library.availableTags,
  }));

  const isLoading = isDbLoading || libraryLoading;

  useEffect(() => {
      if (!isDbLoading) {
          // The store setters (setAllCardSets, etc.) now have internal guards
          // to prevent updates if data is identical.
          setAllCardSets(dbAllCardSets ?? []);
          setAvailableThemes(dbAvailableThemes ?? []);
          setAvailableTags(dbAvailableTags ?? []);
      }
  // Dependencies:
  // - isDbLoading: Triggers effect when loading state changes.
  // - dbAllCardSets, dbAvailableThemes, dbAvailableTags: Data from IndexedDB. Effect runs if these change.
  // - Setters (setAllCardSets, etc.): Stable functions from Zustand, included for exhaustiveness/linting.
  // Not including currentAllCardSets, etc. here to avoid direct loops if setters didn't have guards.
  // The guards within the setters are the primary defense against infinite loops.
  }, [isDbLoading, dbAllCardSets, dbAvailableThemes, dbAvailableTags, setAllCardSets, setAvailableThemes, setAvailableTags]);


  return (
    <div>
      <PageTitle title="ダッシュボード" subtitle="おかえりなさい！学習の概要はこちらです。" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <section className="lg:col-span-2">
             <h2 className="mb-4 text-xl font-semibold">クイックアクセス</h2>
             <QuickAccess />
         </section>

         <section>
             <h2 className="mb-4 text-xl font-semibold">おすすめの学習</h2>
             {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
             ) : (
                <StudySuggestions cardSets={currentAllCardSets} />
             )}
         </section>

         <section className="lg:col-span-3">
              <h2 className="mb-4 text-xl font-semibold">最近のアクティビティ</h2>
               {isLoading ? (
                 <div className="space-y-2">
                     <Skeleton className="h-16 w-full" />
                     <Skeleton className="h-16 w-full" />
                     <Skeleton className="h-16 w-full" />
                 </div>
               ) : (
                 <RecentActivity cardSets={currentAllCardSets} />
               )}
         </section>

      </div>
    </div>
  );
}
