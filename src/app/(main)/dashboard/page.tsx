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
  const { allCardSets, availableThemes, availableTags } = useIndexedDB();
  // Destructure setters directly
  const { setAllCardSets, setAvailableThemes, setAvailableTags } = useStore((state) => ({
      setAllCardSets: state.library.setAllCardSets,
      setAvailableThemes: state.library.setAvailableThemes,
      setAvailableTags: state.library.setAvailableTags,
  }));

  const isLoading = allCardSets === undefined || availableThemes === undefined || availableTags === undefined;

  useEffect(() => {
      if (!isLoading) {
          setAllCardSets(allCardSets ?? []); // Pass data or empty array
          setAvailableThemes(availableThemes ?? []);
          setAvailableTags(availableTags ?? []);
      }
      // Now the setters are stable references
  }, [isLoading, allCardSets, availableThemes, availableTags, setAllCardSets, setAvailableThemes, setAvailableTags]);

  return (
    <div>
      <PageTitle title="Dashboard" subtitle="Welcome back! Here's your learning overview." />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <section className="lg:col-span-2">
             <h2 className="mb-4 text-xl font-semibold">Quick Access</h2>
             <QuickAccess />
         </section>

         <section>
             <h2 className="mb-4 text-xl font-semibold">Study Suggestions</h2>
             {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
             ) : (
                <StudySuggestions cardSets={allCardSets} />
             )}
         </section>

         <section className="lg:col-span-3">
              <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
               {isLoading ? (
                 <div className="space-y-2">
                     <Skeleton className="h-16 w-full" />
                     <Skeleton className="h-16 w-full" />
                     <Skeleton className="h-16 w-full" />
                 </div>
               ) : (
                 <RecentActivity cardSets={allCardSets} />
               )}
         </section>

      </div>
    </div>
  );
}
