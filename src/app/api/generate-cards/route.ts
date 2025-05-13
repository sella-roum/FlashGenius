import { type NextRequest, NextResponse } from 'next/server';
import { generateFlashcards, type GenerateFlashcardsInput } from '@/ai/flows/generate-flashcards';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication and rate limiting here

    const body = await request.json();

    // Basic validation - Zod validation would be more robust
    if (!body || typeof body !== 'object' || !body.inputType || !body.inputValue) {
        return NextResponse.json({ error: 'Missing inputType or inputValue' }, { status: 400 });
    }

    const input: GenerateFlashcardsInput = {
      inputType: body.inputType,
      inputValue: body.inputValue,
      // Include generationOptions if passed from the client
       // generationOptions: body.generationOptions || { cardType: 'term-definition', language: 'English' } // Example default
    };

    // Input validation using Zod could be added here before calling the flow
    // const validationResult = GenerateFlashcardsInputSchema.safeParse(input);
    // if (!validationResult.success) {
    //     return NextResponse.json({ error: 'Invalid input data', details: validationResult.error.errors }, { status: 400 });
    // }

    console.log("Calling generateFlashcards flow with input:", input); // Server-side log

    // Call the Genkit flow
    const result = await generateFlashcards(input);

    console.log("generateFlashcards flow returned:", result); // Server-side log

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API /generate-cards] Error:', error);
    // Provide a generic error message to the client
    return NextResponse.json({ error: error.message || 'Failed to generate flashcards' }, { status: 500 });
  }
}

// Optional: Handle GET requests or other methods if needed
// export async function GET() {
//   return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
// }
