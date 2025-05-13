'use server';
/**
 * @fileOverview Generates flashcards from user input using the Gemini API.
 *
 * - generateFlashcards - A function that handles the flashcard generation process.
 * - GenerateFlashcardsInput - The input type for the generateFlashcards function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcards function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerationOptions as GenOptionsType } from '@/types'; // Import the type

const GenerationOptionsSchema = z.object({
  cardType: z.enum(['term-definition', 'qa', 'image-description']).describe('The desired format for the flashcards (e.g., term/definition or question/answer).'),
  language: z.string().describe('The target language for the flashcard content.'),
  additionalPrompt: z.string().optional().describe('Optional user-provided instructions to further guide the generation process.'),
});

const GenerateFlashcardsInputSchema = z.object({
  inputType: z.enum(['file', 'url', 'text']).describe('The type of input provided by the user.'),
  inputValue: z.string().describe('The input value (text content, URL content, or file content).'),
  generationOptions: GenerationOptionsSchema.optional().describe('Options to customize the flashcard generation.'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({
  front: z.string().describe('The front side of the flashcard (term or question).'),
  back: z.string().describe('The back side of the flashcard (definition or answer).'),
});

const GenerateFlashcardsOutputSchema = z.object({
  cards: z.array(FlashcardSchema).describe('An array of generated flashcards.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  // Provide default options if none are given
  const optionsWithDefaults: GenOptionsType = {
      cardType: input.generationOptions?.cardType || 'term-definition',
      language: input.generationOptions?.language || '日本語',
      additionalPrompt: input.generationOptions?.additionalPrompt || '',
  };
  const flowInput = { ...input, generationOptions: optionsWithDefaults };
  return generateFlashcardsFlow(flowInput);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `あなたはフラッシュカード作成のエキスパートです。提供された情報源から、指定されたオプションに従って高品質なフラッシュカードを作成します。

  **重要:** 生成されるカードは必ず指定された「言語」({{{generationOptions.language}}})でなければなりません。元の資料が異なる言語であっても、必ず「{{{generationOptions.language}}}」に翻訳・記述してください。

  **カード形式:** カードは「{{{generationOptions.cardType}}}」の形式で生成してください。
  - 'term-definition': 表面に用語、裏面にその定義を記述します。
  - 'qa': 表面に質問、裏面にその答えを記述します。

  **情報源:**
  入力タイプ: {{{inputType}}}
  内容:
  {{{inputValue}}}

  {{#if generationOptions.additionalPrompt}}
  **追加の指示:**
  ユーザーからの以下の指示にも従ってください：
  {{{generationOptions.additionalPrompt}}}
  {{/if}}

  上記の情報を基に、指定された言語と形式でフラッシュカードを生成してください。結果は 'cards' 配列を含むJSONオブジェクトで返してください。各カードオブジェクトは 'front' と 'back' フィールドを持つ必要があります。
  `,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
       // Consider adding others if needed, e.g., DANGEROUS_CONTENT
    ],
  },
});

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async input => {
    // Ensure default options are set if not provided in the input already (redundant check based on wrapper)
     const optionsWithDefaults: GenOptionsType = {
       cardType: input.generationOptions?.cardType || 'term-definition',
       language: input.generationOptions?.language || '日本語',
       additionalPrompt: input.generationOptions?.additionalPrompt || '',
     };
     const effectiveInput = { ...input, generationOptions: optionsWithDefaults };

    const {output} = await prompt(effectiveInput);
    return output!;
  }
);
