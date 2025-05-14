
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

const MAX_INPUT_CHAR_LENGTH_FOR_FLOW = 500000; // Character limit for text content passed to LLM

const GenerationOptionsSchema = z.object({
  cardType: z.enum(['term-definition', 'qa', 'image-description']).describe('The desired format for the flashcards (e.g., term/definition or question/answer).'),
  language: z.string().describe('The target language for the flashcard content.'),
  additionalPrompt: z.string().optional().describe('Optional user-provided instructions to further guide the generation process.'),
});

// Schema for the input the FLOW function receives
const GenerateFlashcardsInputSchema = z.object({
  inputType: z.enum(['file', 'url', 'text']).describe('The type of input provided by the user.'),
  inputValue: z.string().describe('The input value (text content, URL, or data URI for files).'),
  generationOptions: GenerationOptionsSchema.optional().describe('Options to customize the flashcard generation.'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

// Extended schema for the input the PROMPT itself receives
const GenerateFlashcardsPromptInputSchema = GenerateFlashcardsInputSchema.extend({
  isMediaInput: z.boolean().describe('Whether the inputValue is a media data URI (image/PDF).'),
});


const FlashcardSchema = z.object({
  front: z.string().describe('The front side of the flashcard (term or question).'),
  back: z.string().describe('The back side of the flashcard (definition or answer).'),
});

const GenerateFlashcardsOutputSchema = z.object({
  cards: z.array(FlashcardSchema).describe('An array of generated flashcards.'),
  // Optional: Add a field for warnings like backend truncation if needed
  // warningMessage: z.string().optional().describe('Any warnings from the generation process.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;


export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  // Default options are applied within the flow now before passing to prompt
  return generateFlashcardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsPromptInputSchema}, // Use the extended schema for prompt
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `あなたはフラッシュカード作成のエキスパートです。提供された情報源から、指定されたオプションに従って高品質なフラッシュカードを作成します。

  **重要:** 生成されるカードは必ず指定された「言語」({{{generationOptions.language}}})でなければなりません。元の資料が異なる言語であっても、必ず「{{{generationOptions.language}}}」に翻訳・記述してください。PDFや画像ファイルの内容も、指定された言語に翻訳してください。

  **カード形式:** カードは「{{{generationOptions.cardType}}}」の形式で生成してください。
  - 'term-definition': 表面に用語、裏面にその定義を記述します。
  - 'qa': 表面に質問、裏面にその答えを記述します。
  - 'image-description': (画像入力の場合) 表面に画像、裏面にその説明を記述します。

  **コンテンツの品質と独立性:**
  - 各フラッシュカードは、元の資料を参照しなくても単独で意味が通じるようにしてください。
  - 資料内の特定の図、表、ページ番号、または「上記の画像」のような、フラッシュカードの文脈外では理解できない参照は含めないでください。そのような情報は、必要であれば一般的な説明に置き換えるか、省略してください。
  - 例えば、「図3に示すように、光合成は...」ではなく、「光合成は、植物が光エネルギーを化学エネルギーに変換するプロセスで...」のように記述します。
  - 資料内に画像や図への言及がある場合（'image-description'カードタイプで画像自体が入力として提供されている場合を除く）、その画像自体をカードに含めるのではなく、その画像が伝えている重要な情報や概念をテキストで説明するようにしてください。

  **情報源:**
  入力タイプ: {{{inputType}}}
  {{#if isMediaInput}}
  提供されたファイル (画像またはPDF): {{media url=inputValue}}
  {{else}}
  内容:
  {{{inputValue}}}
  **指示:** 上記の「内容」がウェブページやPDF文書から抽出されたテキストである可能性があります。その場合、ページのヘッダー、フッター、ナビゲーション、広告、または文書のメタデータのような主要でない情報が含まれているかもしれません。主要な情報、事実、概念に焦点を当て、それらからフラッシュカードを作成してください。文書の構造やファイル形式に関する情報は無視してください。
  {{/if}}

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
      // Consider HARM_CATEGORY_DANGEROUS_CONTENT if dealing with arbitrary user files.
    ],
  },
});

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema, // Flow input is the original schema
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async (flowInput) => {
    let processedInputValue = flowInput.inputValue;
    const originalInputType = flowInput.inputType;
    let isMediaInput = false;
    let backendTruncationWarning: string | null = null; // For flow-side truncations

    if (originalInputType === 'url') {
      try {
        const fullUrlToFetch = flowInput.inputValue.startsWith('http') 
          ? flowInput.inputValue
          : `${JINA_READER_URL_PREFIX}${flowInput.inputValue}`;
        
        console.log(`Flow: URL「${fullUrlToFetch}」からコンテンツを取得しています`);
        const response = await fetch(fullUrlToFetch);
        if (!response.ok) {
          throw new Error(`Jina AI からのURLコンテンツの取得に失敗しました: ${response.status} ${response.statusText}`);
        }
        let textContent = await response.text(); // Jina usually returns text or markdown
        
        if (textContent.length > MAX_INPUT_CHAR_LENGTH_FOR_FLOW) {
          textContent = textContent.substring(0, MAX_INPUT_CHAR_LENGTH_FOR_FLOW);
          backendTruncationWarning = `URLからのコンテンツが長すぎたため、約${MAX_INPUT_CHAR_LENGTH_FOR_FLOW.toLocaleString()}文字に切り詰められました。`;
          console.warn(`Flow: ${backendTruncationWarning}`);
        }
        processedInputValue = textContent;
        isMediaInput = false; // URL content is processed as text for the LLM
      } catch (e: any) {
        console.error("Flow: URLコンテンツの処理エラー:", e);
        processedInputValue = `URLコンテンツの取得に失敗しました: ${flowInput.inputValue}. エラー: ${e.message}`;
        isMediaInput = false;
      }
    } else if (originalInputType === 'file') {
      // Client sends data URI for images/PDFs, or text for .txt/.md
      if (typeof flowInput.inputValue === 'string' && flowInput.inputValue.startsWith('data:')) {
        // It's a data URI (image or PDF from client)
        processedInputValue = flowInput.inputValue; // Pass the data URI directly
        isMediaInput = true;
        // MAX_INPUT_CHAR_LENGTH_FOR_FLOW does not apply to data URIs here.
        // Gemini will handle its own size limits for media.
      } else if (typeof flowInput.inputValue === 'string') {
        // It's text content from a .txt or .md file (or unsupported parsed as text by client)
        processedInputValue = flowInput.inputValue;
        if (processedInputValue.length > MAX_INPUT_CHAR_LENGTH_FOR_FLOW) {
          processedInputValue = processedInputValue.substring(0, MAX_INPUT_CHAR_LENGTH_FOR_FLOW);
          backendTruncationWarning = `ファイル入力 (${originalInputType}) が長すぎたため、約${MAX_INPUT_CHAR_LENGTH_FOR_FLOW.toLocaleString()}文字に切り詰められました。`;
          console.warn(`Flow: ${backendTruncationWarning}`);
        }
        isMediaInput = false;
      } else {
        // This case should ideally not be reached if client prepares data correctly
        processedInputValue = "ファイル処理エラー: 無効なファイルデータ形式です。";
        isMediaInput = false;
      }
    } else if (originalInputType === 'text') {
      // Raw text input from user
      processedInputValue = flowInput.inputValue;
      if (processedInputValue.length > MAX_INPUT_CHAR_LENGTH_FOR_FLOW) {
        processedInputValue = processedInputValue.substring(0, MAX_INPUT_CHAR_LENGTH_FOR_FLOW);
        backendTruncationWarning = `テキスト入力が長すぎたため、約${MAX_INPUT_CHAR_LENGTH_FOR_FLOW.toLocaleString()}文字に切り詰められました。`;
        console.warn(`Flow: ${backendTruncationWarning}`);
      }
      isMediaInput = false;
    }

     const optionsWithDefaults: GenOptionsType = {
       cardType: flowInput.generationOptions?.cardType || 'term-definition',
       language: flowInput.generationOptions?.language || '日本語',
       additionalPrompt: flowInput.generationOptions?.additionalPrompt || '',
     };
     
     // This object must match GenerateFlashcardsPromptInputSchema
     const effectiveInputForPrompt = { 
        inputType: originalInputType,
        inputValue: processedInputValue,
        generationOptions: optionsWithDefaults,
        isMediaInput: isMediaInput, 
    };

    const {output} = await prompt(effectiveInputForPrompt as z.infer<typeof GenerateFlashcardsPromptInputSchema>);
    
    // If backendTruncationWarning exists, we could potentially add it to the output
    // For now, it's logged. Client handles its own truncation warnings.
    // if (output && backendTruncationWarning) {
    //   (output as GenerateFlashcardsOutput).warningMessage = backendTruncationWarning;
    // }
    
    return output!;
  }
);

