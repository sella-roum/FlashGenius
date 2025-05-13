
import { createContext, useContext } from 'react';
import { createStore, useStore as useZustandStore, type StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CardSet, Flashcard, GenerationOptions, Tag } from '@/types';
import { API_ENDPOINTS, JINA_READER_URL_PREFIX } from '@/lib/constants';
import { provideDetailedExplanation } from '@/ai/flows/provide-detailed-explanations';
import { requestAiGeneratedHint } from '@/ai/flows/provide-study-hints';
import { generateFlashcards } from '@/ai/flows/generate-flashcards';
import type { GenerateFlashcardsInput, GenerateFlashcardsOutput } from '@/ai/flows/generate-flashcards';
import type { ProvideDetailedExplanationInput } from '@/ai/flows/provide-detailed-explanations';
import type { RequestAiGeneratedHintInput } from '@/ai/flows/provide-study-hints';

// Define State and Actions Interfaces

// --- Generate Store ---
interface GenerateState {
  inputType: 'file' | 'url' | 'text' | null;
  inputValue: string | File | null;
  generationOptions: GenerationOptions;
  previewCards: Flashcard[];
  isLoading: boolean;
  error: string | null;
  cardSetName: string;
  cardSetTheme: string;
  cardSetTags: string[]; // Store tag names
}

interface GenerateActions {
  setInputType: (type: GenerateState['inputType']) => void;
  setInputValue: (value: GenerateState['inputValue']) => void;
  setGenerationOptions: (options: Partial<GenerationOptions>) => void;
  setCardSetName: (name: string) => void;
  setCardSetTheme: (theme: string) => void;
  setCardSetTags: (tags: string[]) => void;
  addCardSetTag: (tag: string) => void;
  removeCardSetTag: (tag: string) => void;
  generatePreview: () => Promise<void>;
  updatePreviewCard: (index: number, card: Partial<Flashcard>) => void;
  addPreviewCard: (card?: Flashcard) => void;
  deletePreviewCard: (index: number) => void;
  resetGenerator: () => void;
  // Note: saveToLibrary is handled via useIndexedDB hook in the component
}

// --- Library Store ---
interface LibraryState {
  allCardSets: CardSet[]; // Populated from IndexedDB via hook
  filteredCardSets: CardSet[];
  filterTheme: string | null;
  filterTags: string[];
  availableThemes: string[]; // Populated from IndexedDB via hook
  availableTags: string[]; // Populated from IndexedDB via hook
  isLoading: boolean;
  error: string | null;
}

interface LibraryActions {
  setAllCardSets: (sets: CardSet[]) => void; // Method to update from hook
  setAvailableThemes: (themes: string[]) => void;
  setAvailableTags: (tags: string[]) => void;
  setFilterTheme: (theme: string | null) => void;
  addFilterTag: (tag: string) => void;
  removeFilterTag: (tag: string) => void;
  applyFilters: () => void; // Re-calculates filteredCardSets
  resetFilters: () => void;
  // deleteCardSet handled via useIndexedDB hook
}

// --- Study Store ---
interface StudyState {
  activeCardSetIds: string[];
  originalDeck: Flashcard[]; // Keep original order/state if needed
  currentDeck: Flashcard[]; // Shuffled/modified deck for study
  currentCardIndex: number;
  currentCard: Flashcard | null;
  isFrontVisible: boolean;
  currentHint: string | null;
  isHintLoading: boolean;
  currentDetails: string | null;
  isDetailsLoading: boolean;
  error: string | null;
}

interface StudyActions {
  startStudySession: (cardSets: CardSet[]) => void;
  flipCard: () => void;
  nextCard: () => void;
  previousCard: () => void; // Optional: Add previous card functionality
  fetchHint: () => Promise<void>;
  fetchDetails: () => Promise<void>;
  clearHintAndDetails: () => void;
  shuffleDeck: () => void;
  resetStudySession: () => void;
}

// Combined Store Type
export type Store = {
  generate: GenerateState & GenerateActions;
  library: LibraryState & LibraryActions;
  study: StudyState & StudyActions;
};

// Initial States
const initialGenerateState: GenerateState = {
  inputType: null,
  inputValue: null,
  generationOptions: { cardType: 'term-definition', language: 'English' },
  previewCards: [],
  isLoading: false,
  error: null,
  cardSetName: '',
  cardSetTheme: '',
  cardSetTags: [],
};

const initialLibraryState: LibraryState = {
  allCardSets: [],
  filteredCardSets: [],
  filterTheme: null,
  filterTags: [],
  availableThemes: [],
  availableTags: [],
  isLoading: false,
  error: null,
};

const initialStudyState: StudyState = {
  activeCardSetIds: [],
  originalDeck: [],
  currentDeck: [],
  currentCardIndex: -1,
  currentCard: null,
  isFrontVisible: true,
  currentHint: null,
  isHintLoading: false,
  currentDetails: null,
  isDetailsLoading: false,
  error: null,
};

// Create Store Implementation
const createFlashGeniusStore = (
  initProps?: Partial<Store>
) => {
  const DEFAULT_PROPS: Store = {
    generate: { ...initialGenerateState } as GenerateState & GenerateActions, // Cast needed initially
    library: { ...initialLibraryState } as LibraryState & LibraryActions,
    study: { ...initialStudyState } as StudyState & StudyActions,
  };

  return createStore<Store>()(
    immer((set, get) => ({
      ...DEFAULT_PROPS,
      ...initProps,

      // --- Generate Store Implementation ---
      generate: {
        ...initialGenerateState,
        ...(initProps?.generate),
        setInputType: (type) => set((state) => { state.generate.inputType = type; }),
        setInputValue: (value) => set((state) => { state.generate.inputValue = value; }),
        setGenerationOptions: (options) => set((state) => {
          state.generate.generationOptions = { ...state.generate.generationOptions, ...options };
        }),
         setCardSetName: (name) => set((state) => { state.generate.cardSetName = name; }),
        setCardSetTheme: (theme) => set((state) => { state.generate.cardSetTheme = theme; }),
        setCardSetTags: (tags) => set((state) => { state.generate.cardSetTags = tags; }),
        addCardSetTag: (tag) => set((state) => {
            if (!state.generate.cardSetTags.includes(tag)) {
                 state.generate.cardSetTags.push(tag);
            }
        }),
        removeCardSetTag: (tag) => set((state) => {
            state.generate.cardSetTags = state.generate.cardSetTags.filter(t => t !== tag);
        }),
        generatePreview: async () => {
          const { inputType, inputValue, generationOptions } = get().generate;
          if (!inputType || !inputValue) {
            set((state) => { state.generate.error = 'Input type and value are required.'; });
            return;
          }

          set((state) => {
            state.generate.isLoading = true;
            state.generate.error = null;
            state.generate.previewCards = [];
          });

          try {
            let apiInput: GenerateFlashcardsInput;

            if (inputType === 'file' && inputValue instanceof File) {
              // For file input, we need to read its content.
              // Assuming it's a text-based file for now.
              // For image files, this would need to be a data URI.
              const fileContent = await inputValue.text(); // Simplification, might need to handle different file types
              apiInput = { inputType: 'text', inputValue: fileContent }; // Sending as text
            } else if (inputType === 'url' && typeof inputValue === 'string') {
              // Prefix with Jina Reader URL if it's a general web URL
              // This logic might need adjustment based on specific URL types to avoid double-prefixing
              // const processedUrl = inputValue.startsWith('http') ? `${JINA_READER_URL_PREFIX}${inputValue}` : inputValue;
              apiInput = { inputType: 'url', inputValue: inputValue };
            } else if (inputType === 'text' && typeof inputValue === 'string') {
              apiInput = { inputType: 'text', inputValue: inputValue };
            } else {
              throw new Error('Invalid input type or value.');
            }

            // const result = await generateFlashcards(apiInput); // Direct flow call

            const response = await fetch(API_ENDPOINTS.GENERATE_CARDS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiInput), // Send the processed input
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `API Error: ${response.statusText}`);
            }

            const result: GenerateFlashcardsOutput = await response.json();
            const cardsWithIds = result.cards.map(card => ({...card, id: crypto.randomUUID()}));


            set((state) => {
              state.generate.previewCards = cardsWithIds;
            });

          } catch (error: any) {
            console.error("Error generating preview:", error);
            set((state) => { state.generate.error = error.message || 'Failed to generate preview.'; });
          } finally {
            set((state) => { state.generate.isLoading = false; });
          }
        },
         updatePreviewCard: (index, cardUpdate) => set((state) => {
            if (state.generate.previewCards[index]) {
                state.generate.previewCards[index] = { ...state.generate.previewCards[index], ...cardUpdate };
            }
        }),
        addPreviewCard: (card) => set((state) => {
            const newCard: Flashcard = card || { id: crypto.randomUUID(), front: '', back: '' };
            if (!newCard.id) newCard.id = crypto.randomUUID();
            state.generate.previewCards.push(newCard);
        }),
        deletePreviewCard: (index) => set((state) => {
            state.generate.previewCards.splice(index, 1);
        }),
        resetGenerator: () => set((state) => {
            state.generate = { ...state.generate, ...initialGenerateState, cardSetTags: [], previewCards: [] }; // Ensure arrays are also reset
         }),

      },

      // --- Library Store Implementation ---
      library: {
        ...initialLibraryState,
        ...(initProps?.library),
        setAllCardSets: (newAllCardSets) => {
          set((state) => {
            state.library.allCardSets = newAllCardSets;
            // state.library.filteredCardSets = newAllCardSets; // Initialize filtered list
            // Instead of directly setting, call applyFilters to ensure consistency
          });
          get().library.applyFilters(); // Apply filters whenever allCardSets changes
        },
        setAvailableThemes: (themes) => set((state) => { state.library.availableThemes = themes; }),
        setAvailableTags: (tags) => set((state) => { state.library.availableTags = tags; }),
        setFilterTheme: (theme) => {
          set((state) => { state.library.filterTheme = theme; });
          get().library.applyFilters();
        },
        addFilterTag: (tag) => {
          let needsFilterUpdate = false;
          set((state) => {
            if (!state.library.filterTags.includes(tag)) {
              state.library.filterTags.push(tag);
              needsFilterUpdate = true;
            }
          });
          if (needsFilterUpdate) { // Only call applyFilters if the tags actually changed
            get().library.applyFilters();
          }
        },
        removeFilterTag: (tag) => {
          let needsFilterUpdate = false;
          set((state) => {
            const initialLength = state.library.filterTags.length;
            state.library.filterTags = state.library.filterTags.filter(t => t !== tag);
            if (state.library.filterTags.length !== initialLength) {
              needsFilterUpdate = true;
            }
          });
           if (needsFilterUpdate) { // Only call applyFilters if the tags actually changed
            get().library.applyFilters();
          }
        },
        applyFilters: () => set((state) => {
            let sets = state.library.allCardSets;
            if (state.library.filterTheme) {
                sets = sets.filter(set => set.theme === state.library.filterTheme);
            }
            if (state.library.filterTags.length > 0) {
                 const tagSet = new Set(state.library.filterTags);
                 sets = sets.filter(set => set.tags.some(tag => tagSet.has(tag)));
            }
            state.library.filteredCardSets = sets;
        }),
        resetFilters: () => {
          set((state) => {
            state.library.filterTheme = null;
            state.library.filterTags = [];
          });
          get().library.applyFilters();
        },
      },

      // --- Study Store Implementation ---
      study: {
        ...initialStudyState,
        ...(initProps?.study),
        startStudySession: (cardSets) => set((state) => {
           const allCards = cardSets.flatMap(set => set.cards);
           const shuffledCards = [...allCards].sort(() => Math.random() - 0.5); // Simple shuffle

           state.study = {
                ...initialStudyState, // Reset state first
                activeCardSetIds: cardSets.map(set => set.id),
                originalDeck: allCards,
                currentDeck: shuffledCards,
                currentCardIndex: shuffledCards.length > 0 ? 0 : -1,
                currentCard: shuffledCards.length > 0 ? shuffledCards[0] : null,
                isFrontVisible: true,
           };
        }),
        flipCard: () => set((state) => {
             if (state.study.currentCard) {
                state.study.isFrontVisible = !state.study.isFrontVisible;
                if (state.study.isFrontVisible) {
                    // Clear hint/details when flipping back to front
                    state.study.currentHint = null;
                    state.study.currentDetails = null;
                    state.study.isHintLoading = false;
                    state.study.isDetailsLoading = false;
                }
            }
         }),
        nextCard: () => set((state) => {
            const nextIndex = state.study.currentCardIndex + 1;
             if (nextIndex < state.study.currentDeck.length) {
                state.study.currentCardIndex = nextIndex;
                state.study.currentCard = state.study.currentDeck[nextIndex];
                state.study.isFrontVisible = true;
                state.study.currentHint = null;
                state.study.currentDetails = null;
                state.study.isHintLoading = false;
                state.study.isDetailsLoading = false;
            } else {
                // End of deck
                state.study.currentCardIndex = -1; // Signal end of session
                state.study.currentCard = null;
                // state.study.isFrontVisible = true;
                // state.study.currentHint = null;
                // state.study.currentDetails = null;
            }
        }),
        previousCard: () => set((state) => {
            const prevIndex = state.study.currentCardIndex - 1;
            if (prevIndex >= 0) {
                state.study.currentCardIndex = prevIndex;
                state.study.currentCard = state.study.currentDeck[prevIndex];
                state.study.isFrontVisible = true;
                state.study.currentHint = null;
                state.study.currentDetails = null;
                state.study.isHintLoading = false;
                state.study.isDetailsLoading = false;
            }
        }),
        fetchHint: async () => {
           const currentCard = get().study.currentCard;
           if (!currentCard || get().study.isHintLoading || get().study.currentHint) return; // Don't fetch if already have one

           set(state => { state.study.isHintLoading = true; state.study.error = null; });

           try {
               const input: RequestAiGeneratedHintInput = { front: currentCard.front, back: currentCard.back };
                // const result = await requestAiGeneratedHint(input); // Direct flow call
                const response = await fetch(API_ENDPOINTS.GENERATE_HINT, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(input),
                });
                 if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `API Error: ${response.statusText}`);
                }
                const result = await response.json();

               set(state => { state.study.currentHint = result.hint; });
           } catch (error: any) {
               console.error("Error fetching hint:", error);
               set(state => { state.study.error = error.message || 'Failed to fetch hint.'; });
           } finally {
               set(state => { state.study.isHintLoading = false; });
           }
        },
        fetchDetails: async () => {
           const currentCard = get().study.currentCard;
           if (!currentCard || get().study.isDetailsLoading || get().study.currentDetails) return; // Don't fetch if already have one

            set(state => { state.study.isDetailsLoading = true; state.study.error = null; });

           try {
               const input: ProvideDetailedExplanationInput = { front: currentCard.front, back: currentCard.back };
                // const result = await provideDetailedExplanation(input); // Direct flow call
                const response = await fetch(API_ENDPOINTS.GENERATE_DETAILS, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(input),
                });
                 if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `API Error: ${response.statusText}`);
                }
                const result = await response.json();

               set(state => { state.study.currentDetails = result.details; });
           } catch (error: any) {
               console.error("Error fetching details:", error);
               set(state => { state.study.error = error.message || 'Failed to fetch details.'; });
           } finally {
               set(state => { state.study.isDetailsLoading = false; });
           }
        },
        clearHintAndDetails: () => set((state) => {
            state.study.currentHint = null;
            state.study.currentDetails = null;
            state.study.isHintLoading = false;
            state.study.isDetailsLoading = false;
            state.study.error = null; // Also clear error related to hint/details
         }),
         shuffleDeck: () => set((state) => {
             state.study.currentDeck = [...state.study.originalDeck].sort(() => Math.random() - 0.5);
             state.study.currentCardIndex = state.study.currentDeck.length > 0 ? 0 : -1;
             state.study.currentCard = state.study.currentDeck.length > 0 ? state.study.currentDeck[0] : null;
             state.study.isFrontVisible = true;
             state.study.currentHint = null;
             state.study.currentDetails = null;
             state.study.isHintLoading = false;
             state.study.isDetailsLoading = false;
             state.study.error = null;
        }),
        resetStudySession: () => set((state) => {
             state.study = { ...state.study, ...initialStudyState };
         }),
      },

    }))
  );
};

// Context for providing the store
export const StoreContext = createContext<StoreApi<Store> | null>(null);

// Hook for using the store
export const useStore = <T>(selector: (store: Store) => T): T => {
  const storeContext = useContext(StoreContext);

  if (!storeContext) {
    throw new Error(`useStore must be used within a StoreProvider.`);
  }

  return useZustandStore(storeContext, selector);
};

// Initialize store function (used in provider)
export const initializeStore = (preloadedState: Partial<Store> = {}) =>
  createFlashGeniusStore(preloadedState);

