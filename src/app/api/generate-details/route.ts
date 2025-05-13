import { type NextRequest, NextResponse } from 'next/server';
import { provideDetailedExplanation, type ProvideDetailedExplanationInput } from '@/ai/flows/provide-detailed-explanations';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication and rate limiting here

     const body = await request.json();

     // Basic validation
      if (!body || typeof body !== 'object' || typeof body.front !== 'string' || typeof body.back !== 'string') {
         return NextResponse.json({ error: 'Missing or invalid front/back card content' }, { status: 400 });
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
    console.error('[API /generate-details] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate detailed explanation' }, { status: 500 });
  }
}
