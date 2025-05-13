'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { StudySession } from '@/components/features/study/StudySession';
import { useStore } from '@/lib/store';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Wrapper component to handle Suspense for useSearchParams
function StudyPageContent() {
    const searchParams = useSearchParams();
    const cardSetIdsParam = searchParams.get('setIds');
    const { getCardSetById } = useIndexedDB();
    const { startStudySession, studyState } = useStore((state) => ({
        startStudySession: state.study.startStudySession,
        studyState: state.study,
    }));
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    useEffect(() => {
        const loadStudySession = async () => {
            setIsLoading(true);
            setError(null);
            if (!cardSetIdsParam) {
                 setError('学習するカードセットIDが提供されていません。');
                 setIsLoading(false);
                 return;
            }

            const setIds = cardSetIdsParam.split(',');
            if (setIds.length === 0) {
                 setError('無効なカードセットIDが提供されました。');
                 setIsLoading(false);
                 return;
            }

            try {
                const setsToStudy = [];
                for (const id of setIds) {
                    const cardSet = await getCardSetById(id);
                    if (cardSet) {
                        setsToStudy.push(cardSet);
                    } else {
                        console.warn(`カードセットID ${id} が見つかりません。`);
                        // Optionally inform the user about missing sets
                    }
                }

                if (setsToStudy.length === 0) {
                    setError('指定されたカードセットが見つかりませんでした。');
                } else {
                    startStudySession(setsToStudy);
                }
            } catch (err: any) {
                console.error('学習セッションの読み込みに失敗しました:', err);
                setError(err.message || '学習用カードセットの読み込みに失敗しました。');
            } finally {
                setIsLoading(false);
            }
        };

        loadStudySession();

        // Optional: Cleanup function if needed when component unmounts or params change
        // return () => {
        //     resetStudySession(); // Assuming you have a reset action
        // };
    }, [cardSetIdsParam, getCardSetById, startStudySession]);

    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-center pt-10">
                <LoadingSpinner size={40} />
                <p className="mt-4 text-muted-foreground">学習セッションを読み込み中...</p>
            </div>
        );
    }

    if (error) {
         return (
             <Alert variant="destructive" className="mt-6">
               <BookX className="h-4 w-4" />
               <AlertTitle>学習セッションの読み込みエラー</AlertTitle>
               <AlertDescription>
                 {error} URLを確認するか、ライブラリに戻ってください。
                  <div className="mt-4">
                      <Button asChild variant="outline">
                          <Link href="/library">ライブラリへ</Link>
                      </Button>
                  </div>
               </AlertDescription>
             </Alert>
         );
    }

    if (!studyState.currentCard && studyState.currentDeck.length > 0 && studyState.currentCardIndex === -1) {
      // Study session completed
       return (
             <div className="text-center pt-10">
                <h2 className="text-2xl font-semibold mb-4">セッション完了！</h2>
                <p className="text-muted-foreground mb-6">このセッションのすべてのカードを確認しました。</p>
                <div className="flex justify-center gap-4">
                   <Button variant="outline" onClick={() => startStudySession(studyState.originalDeck.length > 0 ? [{ id: studyState.activeCardSetIds[0], name: 'セットを再開', cards: studyState.originalDeck, tags: [], createdAt: new Date(), updatedAt: new Date() }] : [])}> {/* Simplified restart */}
                      もう一度学習する
                  </Button>
                   <Button asChild>
                       <Link href="/library">ライブラリに戻る</Link>
                   </Button>
                </div>
             </div>
        );
    }

    if (!studyState.currentCard) {
        // This case might happen if the deck was empty initially
        return (
             <Alert variant="default" className="mt-6">
                 <BookX className="h-4 w-4" />
                 <AlertTitle>空のデッキ</AlertTitle>
                 <AlertDescription>
                     選択されたカードセットは空のようです。
                      <div className="mt-4">
                         <Button asChild variant="outline">
                             <Link href="/library">ライブラリへ</Link>
                         </Button>
                     </div>
                 </AlertDescription>
             </Alert>
        );
    }


    return <StudySession />;
}


export default function StudyPage() {
  // Use Suspense to wait for searchParams to be available
  return (
    <div>
      <PageTitle title="学習セッション" subtitle="フラッシュカードに集中して学習しましょう。" />
      <Suspense fallback={<div className="flex justify-center pt-10"><LoadingSpinner size={40} /> <p className="ml-2">読み込み中...</p></div>}>
        <StudyPageContent />
      </Suspense>
    </div>
  );
}
