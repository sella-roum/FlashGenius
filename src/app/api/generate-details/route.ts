import { type NextRequest, NextResponse } from 'next/server';
import { provideDetailedExplanation, type ProvideDetailedExplanationInput } from '@/ai/flows/provide-detailed-explanations';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication and rate limiting here

     const body = await request.json();

     // Basic validation
      if (!body || typeof body !== 'object' || typeof body.front !== 'string' || typeof body.back !== 'string') {
         return NextResponse.json({ error: 'カードの表面/裏面のコンテンツがないか、無効です' }, { status: 400 });
      }


    const input: ProvideDetailedExplanationInput = {
      front: body.front,
      back: body.back,
    };

     // Optional: Add Zod validation here

    // Call the Genkit flow
    const result = await provideDetailedExplanation(input);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API /generate-details] エラー:', error);
    return NextResponse.json({ error: error.message || '詳細な説明の生成に失敗しました' }, { status: 500 });
  }
}
