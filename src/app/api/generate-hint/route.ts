import { type NextRequest, NextResponse } from 'next/server';
import { requestAiGeneratedHint, type RequestAiGeneratedHintInput } from '@/ai/flows/provide-study-hints';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication and rate limiting here

    const body = await request.json();

    // Basic validation
     if (!body || typeof body !== 'object' || typeof body.front !== 'string' || typeof body.back !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid front/back card content' }, { status: 400 });
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
    console.error('[API /generate-hint] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate hint' }, { status: 500 });
  }
}
