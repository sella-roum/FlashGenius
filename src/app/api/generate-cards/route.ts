import { type NextRequest, NextResponse } from 'next/server';
import { generateFlashcards, type GenerateFlashcardsInput } from '@/ai/flows/generate-flashcards';
import type { GenerationOptions } from '@/types'; 

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate essential fields
    if (!body || typeof body !== 'object' || !body.inputType || typeof body.inputValue !== 'string') { // inputValue is now always string from client
        return NextResponse.json({ error: 'inputTypeまたはinputValueがないか、無効です' }, { status: 400 });
    }
    if (!['file', 'text'].includes(body.inputType)) { // 'url' is processed by client into 'text'
        return NextResponse.json({ error: '無効なinputTypeです。 "file" または "text" である必要があります。' }, { status: 400 });
    }
    if (body.generationOptions && typeof body.generationOptions !== 'object') {
         return NextResponse.json({ error: 'generationOptionsが無効です' }, { status: 400 });
    }

    // Input for the flow is now simpler as client handles URL fetching and file-to-dataURI/text conversion.
    const inputForFlow: GenerateFlashcardsInput = {
      inputType: body.inputType as 'file' | 'text',
      inputValue: body.inputValue as string, 
      generationOptions: body.generationOptions as GenerationOptions || undefined
    };

    console.log("generateFlashcardsフローを呼び出し中、入力:", { 
        ...inputForFlow, 
        inputValue: inputForFlow.inputValue.startsWith('data:') ? '[Data URI]' : inputForFlow.inputValue.substring(0,100) + '...' 
    });

    const result = await generateFlashcards(inputForFlow);

    console.log("generateFlashcardsフローの戻り値:", result);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API /generate-cards] エラー:', error);
    return NextResponse.json({ error: error.message || 'フラッシュカードの生成に失敗しました' }, { status: 500 });
  }
}
