'use client';

import React, { useEffect } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { RecentActivity } from '@/components/features/dashboard/RecentActivity';
import { StudySuggestions } from '@/components/features/dashboard/StudySuggestions';
import { QuickAccess } from '@/components/features/dashboard/QuickAccess';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { useStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export default function DashboardPage() {
  const { allCardSets: dbAllCardSets, availableThemes: dbAvailableThemes, availableTags: dbAvailableTags, isLoading: isDbLoading } = useIndexedDB();
  const { setAllCardSets, setAvailableThemes, setAvailableTags, libraryLoading, currentAllCardSets } = useStore((state) => ({
      setAllCardSets: state.library.setAllCardSets,
      setAvailableThemes: state.library.setAvailableThemes,
      setAvailableTags: state.library.setAvailableTags,
      libraryLoading: state.library.isLoading,
      currentAllCardSets: state.library.allCardSets, // Get current store value for comparison if needed
  }));

  const isLoading = isDbLoading || libraryLoading;

  useEffect(() => {
      if (!isDbLoading) {
          setAllCardSets(dbAllCardSets ?? []);
          setAvailableThemes(dbAvailableThemes ?? []);
          setAvailableTags(dbAvailableTags ?? []);
      }
  // Zustand setters (setAllCardSets, etc.) are stable and don't need to be in the dependency array.
  // The store itself now has guards to prevent unnecessary updates if data is identical.
  }, [isDbLoading, dbAllCardSets, dbAvailableThemes, dbAvailableTags]);

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
                <StudySuggestions cardSets={currentAllCardSets} /> // Use card sets from store
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
                 <RecentActivity cardSets={currentAllCardSets} /> // Use card sets from store
               )}
         </section>

      </div>
    </div>
  );
}