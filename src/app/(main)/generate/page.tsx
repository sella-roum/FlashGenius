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
    if (error) {
        toast({ variant: "destructive", title: "Generation Failed", description: error });
    }
  };

  const handleSaveToLibrary = async () => {
    if (!cardSetName.trim()) {
        toast({ variant: "destructive", title: "Save Error", description: "Please enter a name for the card set." });
        return;
    }
     if (previewCards.length === 0) {
        toast({ variant: "destructive", title: "Save Error", description: "Cannot save an empty card set." });
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
        toast({ title: "Success!", description: `Card set "${cardSetName}" saved to library.` });
        resetGenerator(); // Clear the form after successful save
    } catch (err: any) {
        console.error("Failed to save card set:", err);
        toast({ variant: "destructive", title: "Save Failed", description: err.message || "Could not save the card set to the database." });
    }
  };

  return (
    <div>
      <PageTitle title="Generate New Card Set" subtitle="Create flashcards from text, URLs, or files." />

       {error && (
         <Alert variant="destructive" className="mb-4">
           <Terminal className="h-4 w-4" />
           <AlertTitle>Generation Error</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Input & Options Column */}
        <div className="lg:col-span-1 space-y-6">
           <Card>
             <CardHeader>
               <CardTitle>1. Provide Content</CardTitle>
             </CardHeader>
             <CardContent>
               <InputArea />
             </CardContent>
           </Card>
           <Card>
              <CardHeader>
                  <CardTitle>2. Set Options</CardTitle>
              </CardHeader>
              <CardContent>
                 <GenerationOptions />
              </CardContent>
           </Card>
             <Button onClick={handleGeneratePreview} disabled={isLoading || !generate.inputType || !generate.inputValue} className="w-full">
               {isLoading ? <LoadingSpinner size={16} className="mr-2"/> : null}
               {isLoading ? 'Generating...' : '3. Generate Preview'}
             </Button>
        </div>

        {/* Preview & Save Column */}
        <div className="lg:col-span-2">
            <Card>
                 <CardHeader>
                   <CardTitle>4. Preview & Save</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <PreviewAndSave />
                     <Button onClick={handleSaveToLibrary} disabled={previewCards.length === 0 || isLoading} className="mt-4 w-full">
                       Save to Library
                     </Button>
                 </CardContent>
             </Card>

        </div>
      </div>
    </div>
  );
}
