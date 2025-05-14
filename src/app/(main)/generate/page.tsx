
'use client';

import React, { useContext } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { InputArea } from '@/components/features/flashcard-generator/InputArea';
import { GenerationOptions } from '@/components/features/flashcard-generator/GenerationOptions';
import { PreviewAndSave } from '@/components/features/flashcard-generator/PreviewAndSave';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore, StoreContext } from '@/lib/store';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { useToast } from '@/hooks/use-toast';
import type { CardSet } from '@/types';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function GeneratePage() {
  const { toast } = useToast();
  const { addCardSet } = useIndexedDB();
  const storeApi = useContext(StoreContext);

  const {
    generateState,
    isLoading,
    error,
    warningMessage,
    previewCards,
    cardSetName,
    cardSetTheme,
    cardSetTags,
    resetGenerator,
    generatePreview,
  } = useStore((state) => ({
    generateState: state.generate,
    isLoading: state.generate.isLoading,
    error: state.generate.error,
    warningMessage: state.generate.warningMessage,
    previewCards: state.generate.previewCards,
    cardSetName: state.generate.cardSetName,
    cardSetTheme: state.generate.cardSetTheme,
    cardSetTags: state.generate.cardSetTags,
    resetGenerator: state.generate.resetGenerator,
    generatePreview: state.generate.generatePreview,
  }));

  const handleGeneratePreview = async () => {
    await generatePreview();
    if (storeApi) {
      const currentError = storeApi.getState().generate.error;
      if (currentError) {
          toast({ variant: "destructive", title: "生成失敗", description: currentError });
      }
    } else {
      console.error("ZustandストアAPIがコンテキストに見つかりません");
    }
  };

  const handleSaveToLibrary = async () => {
    if (!cardSetName.trim()) {
        toast({ variant: "destructive", title: "保存エラー", description: "カードセット名を入力してください。" });
        return;
    }
     if (previewCards.length === 0) {
        toast({ variant: "destructive", title: "保存エラー", description: "空のカードセットは保存できません。" });
        return;
    }

    const newCardSet: CardSet = {
        id: crypto.randomUUID(),
        name: cardSetName,
        theme: cardSetTheme || undefined,
        tags: cardSetTags,
        cards: previewCards,
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceType: generateState.inputType ?? undefined,
        sourceValue: typeof generateState.inputValue === 'string'
                     ? generateState.inputValue.substring(0, 100)
                     : generateState.inputValue instanceof File
                     ? generateState.inputValue.name
                     : undefined,
    };

    try {
        await addCardSet(newCardSet);
        toast({ title: "成功！", description: `カードセット「${cardSetName}」をライブラリに保存しました。` });
        resetGenerator();
    } catch (err: any) {
        console.error("カードセットの保存に失敗しました:", err);
        toast({ variant: "destructive", title: "保存失敗", description: err.message || "カードセットをデータベースに保存できませんでした。" });
    }
  };

  return (
    <div>
      <PageTitle title="新しいカードセットを生成" subtitle="テキスト、URL、またはファイルからフラッシュカードを作成します。" />

       {warningMessage && !isLoading && (
         <Alert variant="default" className="mb-4 bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300">
           <Info className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
           <AlertTitle>注意</AlertTitle>
           <AlertDescription>{warningMessage}</AlertDescription>
         </Alert>
       )}

       {error && (
         <Alert variant="destructive" className="mb-4">
           <Terminal className="h-4 w-4" />
           <AlertTitle>生成エラー</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-3">
        <div className="lg:col-span-1 lg:sticky lg:top-20 self-start max-h-[calc(100vh-theme(spacing.20)-theme(spacing.6))] flex flex-col">
           <ScrollArea className="flex-grow pr-2"> {/* pr-2 for scrollbar visibility if content pushes against edge */}
             <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>1. コンテンツを提供</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InputArea />
                  </CardContent>
                </Card>
                <Card>
                   <CardHeader>
                       <CardTitle>2. オプションを設定</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <GenerationOptions />
                   </CardContent>
                </Card>
             </div>
           </ScrollArea>
           <div className="mt-auto pt-6 pb-1 pr-2"> {/* Added pb-1 and pr-2 to match ScrollArea padding for alignment */}
              <Button onClick={handleGeneratePreview} disabled={isLoading || !generateState.inputType || !generateState.inputValue} className="w-full">
                {isLoading ? <LoadingSpinner size={16} className="mr-2"/> : null}
                {isLoading ? '生成中...' : '3. プレビューを生成'}
              </Button>
           </div>
        </div>

        <div className="lg:col-span-2 mt-6 lg:mt-0">
            <Card>
                 <CardHeader>
                   <CardTitle>4. プレビューと保存</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <PreviewAndSave />
                     <Button onClick={handleSaveToLibrary} disabled={previewCards.length === 0 || isLoading} className="mt-4 w-full">
                       ライブラリに保存
                     </Button>
                 </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}
