export interface Tag {
  id: string; // UUID
  name: string; // Unique
}

export interface Flashcard {
  id: string; // UUID
  front: string;
  back: string;
  frontImage?: string; // Base64 encoded image data or IndexedDB file reference ID
  backImage?: string;
  hint?: string; // AI generated hint, cached during study
  details?: string; // AI generated details (Markdown), cached during study
}

export interface CardSet {
  id: string; // UUID
  name: string;
  description?: string;
  theme?: string;
  tags: string[]; // Array of Tag names
  cards: Flashcard[];
  createdAt: Date;
  updatedAt: Date;
  sourceType?: 'file' | 'url' | 'text';
  sourceValue?: string; // Filename, URL, or beginning of text
}

// Represents options for generating flashcards
export interface GenerationOptions {
  cardType: 'term-definition' | 'qa' | 'image-description'; // Example types
  language: string; // e.g., '日本語', '英語'
  additionalPrompt?: string; // User-provided additional instructions
  // Add other Gemini instruction options here
}
