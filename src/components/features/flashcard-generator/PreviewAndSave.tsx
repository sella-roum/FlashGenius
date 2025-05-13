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
                    <Label htmlFor="cardSetName">Card Set Name <span className="text-destructive">*</span></Label>
                    <Input
                        id="cardSetName"
                        placeholder="e.g., Chapter 1 Vocabulary"
                        value={cardSetName}
                        onChange={(e) => setCardSetName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="cardSetTheme">Theme / Subject (Optional)</Label>
                    <Input
                        id="cardSetTheme"
                        placeholder="e.g., Biology, History, Programming"
                        value={cardSetTheme}
                        onChange={(e) => setCardSetTheme(e.target.value)}
                    />
                </div>
                 <div>
                     <Label htmlFor="cardSetTags">Tags (Optional)</Label>
                     <TagInput
                         value={cardSetTags}
                         onChange={setCardSetTags}
                         placeholder="Press Enter or comma to add tags..."
                     />
                 </div>
            </div>

             <hr/>

             {/* Card Preview List */}
             <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Generated Cards ({previewCards.length})</h3>
                    <Button variant="outline" size="sm" onClick={handleAddCard} disabled={isLoading}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Card
                    </Button>
                 </div>

                {previewCards.length === 0 && !isLoading && (
                     <Alert>
                         <Info className="h-4 w-4" />
                         <AlertTitle>No Cards Generated Yet</AlertTitle>
                         <AlertDescription>
                           Provide content and click "Generate Preview" to see cards here.
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
