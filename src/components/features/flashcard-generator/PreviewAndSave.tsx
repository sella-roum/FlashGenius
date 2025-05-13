'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { GeneratedCard } from './GeneratedCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/shared/TagInput';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function PreviewAndSave() {
    const {
        previewCards,
        updatePreviewCard,
        addPreviewCard,
        deletePreviewCard,
        cardSetName,
        setCardSetName,
        cardSetTheme,
        setCardSetTheme,
        cardSetTags,
        setCardSetTags,
        isLoading
    } = useStore((state) => ({
        previewCards: state.generate.previewCards,
        updatePreviewCard: state.generate.updatePreviewCard,
        addPreviewCard: state.generate.addPreviewCard,
        deletePreviewCard: state.generate.deletePreviewCard,
        cardSetName: state.generate.cardSetName,
        setCardSetName: state.generate.setCardSetName,
        cardSetTheme: state.generate.cardSetTheme,
        setCardSetTheme: state.generate.setCardSetTheme,
        cardSetTags: state.generate.cardSetTags,
        setCardSetTags: state.generate.setCardSetTags,
        isLoading: state.generate.isLoading,
    }));

    const handleAddCard = () => {
        addPreviewCard();
    };

    return (
        <div className="space-y-6">
            {/* Metadata Inputs */}
            <div className="space-y-4">
                <div>
                    <Label htmlFor="cardSetName">カードセット名 <span className="text-destructive">*</span></Label>
                    <Input
                        id="cardSetName"
                        placeholder="例：第1章の語彙"
                        value={cardSetName}
                        onChange={(e) => setCardSetName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="cardSetTheme">テーマ / 科目 (任意)</Label>
                    <Input
                        id="cardSetTheme"
                        placeholder="例：生物学、歴史、プログラミング"
                        value={cardSetTheme}
                        onChange={(e) => setCardSetTheme(e.target.value)}
                    />
                </div>
                 <div>
                     <Label htmlFor="cardSetTags">タグ (任意)</Label>
                     <TagInput
                         value={cardSetTags}
                         onChange={setCardSetTags}
                         placeholder="Enterキーまたはコンマでタグを追加..."
                     />
                 </div>
            </div>

             <hr/>

             {/* Card Preview List */}
             <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">生成されたカード ({previewCards.length})</h3>
                    <Button variant="outline" size="sm" onClick={handleAddCard} disabled={isLoading}>
                        <PlusCircle className="mr-2 h-4 w-4" /> カードを追加
                    </Button>
                 </div>

                {previewCards.length === 0 && !isLoading && (
                     <Alert>
                         <Info className="h-4 w-4" />
                         <AlertTitle>まだカードが生成されていません</AlertTitle>
                         <AlertDescription>
                           コンテンツを提供し、「プレビューを生成」をクリックすると、ここにカードが表示されます。
                         </AlertDescription>
                     </Alert>
                )}

                {previewCards.length > 0 && (
                    <ScrollArea className="h-[400px] pr-4"> {/* Adjust height as needed */}
                        <div className="space-y-4">
                        {previewCards.map((card, index) => (
                             <GeneratedCard
                                key={card.id || index} // Use card.id if available, otherwise index
                                index={index}
                                card={card}
                                onUpdate={updatePreviewCard}
                                onDelete={deletePreviewCard}
                            />
                        ))}
                        </div>
                    </ScrollArea>
                )}
             </div>
        </div>
    );
}
