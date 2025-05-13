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
import type { GenerationOptions as GenOptionsType } from '@/types'; 
import { JINA_READER_URL_PREFIX } from '@/lib/constants';

const MAX_INPUT_CHAR_LENGTH_FOR_FLOW = 500000; // Character limit for content passed to LLM

const GenerationOptionsSchema = z.object({
  cardType: z.enum(['term-definition', 'qa', 'image-description']).describe('The desired format for the flashcards (e.g., term/definition or question/answer).'),
  language: z.string().describe('The target language for the flashcard content.'),
  additionalPrompt: z.string().optional().describe('Optional user-provided instructions to further guide the generation process.'),
});

const GenerateFlashcardsInputSchema = z.object({
  inputType: z.enum(['file', 'url', 'text']).describe('The type of input provided by the user (file content is sent as text).'),
  inputValue: z.string().describe('The input value (text content, or URL).'),
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
  input: {schema: GenerateFlashcardsInputSchema}, // Uses the same schema, but inputValue might be processed
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
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async (flowInput) => {
    let contentToProcess = flowInput.inputValue;
    const originalInputTypeForPrompt = flowInput.inputType; // To inform LLM about original source type

    if (flowInput.inputType === 'url') {
      try {
        // Client sends raw URL. Flow prefixes with Jina and fetches.
        const fullUrlToFetch = flowInput.inputValue.startsWith('http') 
          ? flowInput.inputValue // If client somehow sends a full Jina URL already
          : `${JINA_READER_URL_PREFIX}${flowInput.inputValue}`;
        
        console.log(`Flow: URL「${fullUrlToFetch}」からコンテンツを取得しています`);
        const response = await fetch(fullUrlToFetch);
        if (!response.ok) {
          throw new Error(`Jina AI からのURLコンテンツの取得に失敗しました: ${response.status} ${response.statusText}`);
        }
        let textContent = await response.text();
        
        if (textContent.length > MAX_INPUT_CHAR_LENGTH_FOR_FLOW) {
          textContent = textContent.substring(0, MAX_INPUT_CHAR_LENGTH_FOR_FLOW);
          console.warn(`Flow: URLからのコンテンツが長すぎたため、約${MAX_INPUT_CHAR_LENGTH_FOR_FLOW.toLocaleString()}文字に切り詰められました。`);
        }
        contentToProcess = textContent;
      } catch (e: any) {
        console.error("Flow: URLコンテンツの処理エラー:", e);
        // Fallback: Pass an error message or the URL itself if fetching fails.
        // The LLM might not handle raw URLs well if it expects text.
        contentToProcess = `URLコンテンツの取得に失敗しました: ${flowInput.inputValue}. エラー: ${e.message}`;
      }
    } else if (flowInput.inputType === 'file' || flowInput.inputType === 'text') {
      // For 'file', client has already read content and sent as text.
      if (flowInput.inputValue.length > MAX_INPUT_CHAR_LENGTH_FOR_FLOW) {
        contentToProcess = flowInput.inputValue.substring(0, MAX_INPUT_CHAR_LENGTH_FOR_FLOW);
        console.warn(`Flow: ${flowInput.inputType} 入力が長すぎたため、約${MAX_INPUT_CHAR_LENGTH_FOR_FLOW.toLocaleString()}文字に切り詰められました。`);
      }
    }

     const optionsWithDefaults: GenOptionsType = {
       cardType: flowInput.generationOptions?.cardType || 'term-definition',
       language: flowInput.generationOptions?.language || '日本語',
       additionalPrompt: flowInput.generationOptions?.additionalPrompt || '',
     };
     
     // Prepare input for the prompt: use original inputType for context, but processed content for inputValue
     const effectiveInputForPrompt = { 
        ...flowInput, 
        inputType: originalInputTypeForPrompt, // For the `{{{inputType}}}` field in prompt
        inputValue: contentToProcess,         // For the `{{{inputValue}}}` field (the actual content)
        generationOptions: optionsWithDefaults 
    };

    const {output} = await prompt(effectiveInputForPrompt);
    return output!;
  }
);
