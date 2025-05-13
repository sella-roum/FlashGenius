import { type NextRequest, NextResponse } from 'next/server';
import { requestAiGeneratedHint, type RequestAiGeneratedHintInput } from '@/ai/flows/provide-study-hints';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication and rate limiting here

    const body = await request.json();

    // Basic validation
     if (!body || typeof body !== 'object' || typeof body.front !== 'string' || typeof body.back !== 'string') {
        return NextResponse.json({ error: 'カードの表面/裏面のコンテンツがないか、無効です' }, { status: 400 });
     }

    const input: RequestAiGeneratedHintInput = {
      front: body.front,
      back: body.back,
    };

    // Optional: Add Zod validation here

    // Call the Genkit flow
    const result = await requestAiGeneratedHint(input);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API /generate-hint] エラー:', error);
    return NextResponse.json({ error: error.message || 'ヒントの生成に失敗しました' }, { status: 500 });
  }
}
