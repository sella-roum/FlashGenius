// This is an AI-powered flashcard learning hub, so this file implements the Genkit flow for providing detailed explanations for flashcards.
'use server';

/**
 * @fileOverview A flow to provide detailed explanations for a given flashcard.
 *
 * - provideDetailedExplanation - A function that generates a detailed explanation for a flashcard.
 * - ProvideDetailedExplanationInput - The input type for the provideDetailedExplanation function.
 * - ProvideDetailedExplanationOutput - The return type for the provideDetailedExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideDetailedExplanationInputSchema = z.object({
  front: z.string().describe('The front side of the flashcard.'),
  back: z.string().describe('The back side of the flashcard.'),
});
export type ProvideDetailedExplanationInput = z.infer<typeof ProvideDetailedExplanationInputSchema>;

const ProvideDetailedExplanationOutputSchema = z.object({
  details: z.string().describe('A detailed explanation of the flashcard content in Markdown format.'),
});
export type ProvideDetailedExplanationOutput = z.infer<typeof ProvideDetailedExplanationOutputSchema>;

export async function provideDetailedExplanation(
  input: ProvideDetailedExplanationInput
): Promise<ProvideDetailedExplanationOutput> {
  return provideDetailedExplanationFlow(input);
}

const provideDetailedExplanationPrompt = ai.definePrompt({
  name: 'provideDetailedExplanationPrompt',
  input: {schema: ProvideDetailedExplanationInputSchema},
  output: {schema: ProvideDetailedExplanationOutputSchema},
  prompt: `You are an expert educator explaining a concept from a flashcard.

  Provide a detailed explanation of the concept, including relevant background information, examples, and analogies.
  The explanation should be in Markdown format.

  Flashcard Front:
  {{front}}

  Flashcard Back:
  {{back}}`,
});

const provideDetailedExplanationFlow = ai.defineFlow(
  {
    name: 'provideDetailedExplanationFlow',
    inputSchema: ProvideDetailedExplanationInputSchema,
    outputSchema: ProvideDetailedExplanationOutputSchema,
  },
  async input => {
    const {output} = await provideDetailedExplanationPrompt(input);
    return output!;
  }
);
