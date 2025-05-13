'use client';

import React, { useState } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { InputArea } from '@/components/features/flashcard-generator/InputArea';
import { GenerationOptions } from '@/components/features/flashcard-generator/GenerationOptions';
import { PreviewAndSave } from '@/components/features/flashcard-generator/PreviewAndSave';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';
import { useIndexedDB } from '@/lib/hooks/useIndexedDB';
import { useToast } from '@/hooks/use-toast';
import type { CardSet } from '@/types';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function GeneratePage() {
  const { toast } = useToast();
  const { addCardSet } = useIndexedDB();
  const {
    generate,
    isLoading,
    error,
    previewCards,
    cardSetName,
    cardSetTheme,
    cardSetTags,
    resetGenerator,
    generatePreview,
  } = useStore((state) => ({
    generate: state.generate,
    isLoading: state.generate.isLoading,
    error: state.generate.error,
    previewCards: state.generate.previewCards,
    cardSetName: state.generate.cardSetName,
    cardSetTheme: state.generate.cardSetTheme,
    cardSetTags: state.generate.cardSetTags,
    resetGenerator: state.generate.resetGenerator,
    generatePreview: state.generate.generatePreview,
  }));

  const handleGeneratePreview = async () => {
    await generatePreview();
    // Toast message for success/error handled within the store or here
    if (get().generate.error) { // Access error from store after generation
        toast({ variant: "destructive", title: "生成失敗", description: get().generate.error });
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
        theme: cardSetTheme || undefined, // Handle empty theme
        tags: cardSetTags,
        cards: previewCards,
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceType: generate.inputType ?? undefined,
        // Avoid saving large file objects or full text in sourceValue, use filename or snippet
        sourceValue: typeof generate.inputValue === 'string'
                     ? generate.inputValue.substring(0, 100) // Snippet for text/url
                     : generate.inputValue instanceof File
                     ? generate.inputValue.name // Filename for file
                     : undefined,
    };

    try {
        await addCardSet(newCardSet);
        toast({ title: "成功！", description: `カードセット「${cardSetName}」をライブラリに保存しました。` });
        resetGenerator(); // Clear the form after successful save
    } catch (err: any) {
        console.error("カードセットの保存に失敗しました:", err);
        toast({ variant: "destructive", title: "保存失敗", description: err.message || "カードセットをデータベースに保存できませんでした。" });
    }
  };

  return (
    <div>
      <PageTitle title="新しいカードセットを生成" subtitle="テキスト、URL、またはファイルからフラッシュカードを作成します。" />

       {error && (
         <Alert variant="destructive" className="mb-4">
           <Terminal className="h-4 w-4" />
           <AlertTitle>生成エラー</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Input & Options Column */}
        <div className="lg:col-span-1 space-y-6">
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
             <Button onClick={handleGeneratePreview} disabled={isLoading || !generate.inputType || !generate.inputValue} className="w-full">
               {isLoading ? <LoadingSpinner size={16} className="mr-2"/> : null}
               {isLoading ? '生成中...' : '3. プレビューを生成'}
             </Button>
        </div>

        {/* Preview & Save Column */}
        <div className="lg:col-span-2">
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
