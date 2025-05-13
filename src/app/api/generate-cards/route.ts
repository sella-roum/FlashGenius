import { type NextRequest, NextResponse } from 'next/server';
import { generateFlashcards, type GenerateFlashcardsInput } from '@/ai/flows/generate-flashcards';
import type { GenerationOptions } from '@/types'; // Import GenerationOptions type

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication and rate limiting here

    const body = await request.json();

    // Basic validation - Zod validation would be more robust
    if (!body || typeof body !== 'object' || !body.inputType || !body.inputValue) {
        return NextResponse.json({ error: 'inputTypeまたはinputValueがありません' }, { status: 400 });
    }
    if (body.generationOptions && typeof body.generationOptions !== 'object') {
         return NextResponse.json({ error: 'generationOptionsが無効です' }, { status: 400 });
    }

    // The client sends its inputType ('file', 'url', 'text') and inputValue.
    // If inputType is 'file', inputValue is already the text content.
    // If inputType is 'url', inputValue is the raw URL.
    // The flow will handle Jina prefixing for URLs and fetching content.
    const inputForFlow: GenerateFlashcardsInput = {
      inputType: body.inputType as 'file' | 'url' | 'text',
      inputValue: body.inputValue as string, // Client ensures string or File (which it converts to string for 'file' type to this API)
      generationOptions: body.generationOptions as GenerationOptions || undefined
    };

    console.log("generateFlashcardsフローを呼び出し中、入力:", inputForFlow); // Server-side log

    // Call the Genkit flow
    const result = await generateFlashcards(inputForFlow);

    console.log("generateFlashcardsフローの戻り値:", result); // Server-side log

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API /generate-cards] エラー:', error);
    // Provide a generic error message to the client
    return NextResponse.json({ error: error.message || 'フラッシュカードの生成に失敗しました' }, { status: 500 });
  }
}
