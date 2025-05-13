// src/ai/flows/provide-study-hints.ts
'use server';
/**
 * @fileOverview A flow that provides hints for studying flashcards.
 *
 * - requestAiGeneratedHint - A function that generates a hint for a given flashcard.
 * - RequestAiGeneratedHintInput - The input type for the requestAiGeneratedHint function.
 * - RequestAiGeneratedHintOutput - The return type for the requestAiGeneratedHint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RequestAiGeneratedHintInputSchema = z.object({
  front: z.string().describe('The text on the front of the flashcard.'),
  back: z.string().describe('The text on the back of the flashcard.'),
});
export type RequestAiGeneratedHintInput = z.infer<typeof RequestAiGeneratedHintInputSchema>;

const RequestAiGeneratedHintOutputSchema = z.object({
  hint: z.string().describe('A hint to help the user recall the back of the card based on the front.'),
});
export type RequestAiGeneratedHintOutput = z.infer<typeof RequestAiGeneratedHintOutputSchema>;

export async function requestAiGeneratedHint(input: RequestAiGeneratedHintInput): Promise<RequestAiGeneratedHintOutput> {
  return requestAiGeneratedHintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'requestAiGeneratedHintPrompt',
  input: {schema: RequestAiGeneratedHintInputSchema},
  output: {schema: RequestAiGeneratedHintOutputSchema},
  prompt: `You are a helpful AI assistant that provides hints for flashcards.

  Given the front and back of a flashcard, generate a hint that will help the user remember the back of the card when shown the front.

  The hint should not directly give away the answer, but should provide a helpful clue.

  Front: {{{front}}}
  Back: {{{back}}}

  Hint: `,
});

const requestAiGeneratedHintFlow = ai.defineFlow(
  {
    name: 'requestAiGeneratedHintFlow',
    inputSchema: RequestAiGeneratedHintInputSchema,
    outputSchema: RequestAiGeneratedHintOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
