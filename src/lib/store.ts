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
}

// --- Library Store ---
interface LibraryState {
  allCardSets: CardSet[];
  filteredCardSets: CardSet[];
  filterTheme: string | null;
  filterTags: string[];
  availableThemes: string[];
  availableTags: string[];
  isLoading: boolean;
  error: string | null;
  _applyFiltersAndUpdateDraft: (draftState: LibraryState) => void; // Internal helper
}

interface LibraryActions {
  setAllCardSets: (sets: CardSet[]) => void;
  setAvailableThemes: (themes: string[]) => void;
  setAvailableTags: (tags: string[]) => void;
  setFilterTheme: (theme: string | null) => void;
  addFilterTag: (tag: string) => void;
  removeFilterTag: (tag: string) => void;
  // applyFilters: () => void; // Removed as it's now internal logic
  resetFilters: () => void;
}

// --- Study Store ---
interface StudyState {
  activeCardSetIds: string[];
  originalDeck: Flashcard[];
  currentDeck: Flashcard[];
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
  previousCard: () => void;
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
  generationOptions: { cardType: 'term-definition', language: '日本語' },
  previewCards: [],
  isLoading: false,
  error: null,
  cardSetName: '',
  cardSetTheme: '',
  cardSetTags: [],
};

const initialLibraryStateWithoutHelpers: Omit<LibraryState, '_applyFiltersAndUpdateDraft'> = {
  allCardSets: [],
  filteredCardSets: [],
  filterTheme: null,
  filterTags: [],
  availableThemes: [],
  availableTags: [],
  isLoading: true, // Set to true initially
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

// Helper function for simple array comparison
const arraysAreEqual = (arr1?: string[], arr2?: string[]): boolean => {
  if (arr1 === arr2) return true; // Catches same reference, or both undefined/null
  if (!arr1 || !arr2) return false; // One is null/undefined, the other isn't
  if (arr1.length !== arr2.length) return false;
  const sortedArr1 = [...arr1].sort();
  const sortedArr2 = [...arr2].sort();
  return sortedArr1.every((value, index) => value === sortedArr2[index]);
};

// Helper function for deep comparison of CardSet arrays
const cardSetsAreEqual = (arr1?: CardSet[], arr2?: CardSet[]): boolean => {
  if (arr1 === arr2) return true; // Catches same reference, or both undefined/null
  if (!arr1 || !arr2) return false; // One is null/undefined, the other isn't
  if (arr1.length !== arr2.length) return false;

  const sortedArr1 = [...arr1].sort((a, b) => a.id.localeCompare(b.id));
  const sortedArr2 = [...arr2].sort((a, b) => a.id.localeCompare(b.id));

  for (let i = 0; i < sortedArr1.length; i++) {
    const set1 = sortedArr1[i];
    const set2 = sortedArr2[i];
    if (
      set1.id !== set2.id ||
      (set1.updatedAt?.getTime() ?? 0) !== (set2.updatedAt?.getTime() ?? 0) ||
      set1.name !== set2.name ||
      set1.theme !== set2.theme ||
      set1.cards.length !== set2.cards.length ||
      !arraysAreEqual(set1.tags, set2.tags)
    ) {
      return false;
    }
    // Deeper comparison of cards array if necessary
    // For now, length and updatedAt are primary change indicators for the set
  }
  return true;
};


// Create Store Implementation
const createFlashGeniusStore = (
  initProps?: Partial<Store>
) => {
  const DEFAULT_PROPS: Store = {
    generate: { ...initialGenerateState } as GenerateState & GenerateActions,
    library: {
        ...initialLibraryStateWithoutHelpers,
        _applyFiltersAndUpdateDraft: () => {},
    } as LibraryState & LibraryActions,
    study: { ...initialStudyState } as StudyState & StudyActions,
  };

  return createStore<Store>()(
    immer((set, get) => ({
      ...DEFAULT_PROPS,
      ...(initProps ?? {}),

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
          const { inputType, inputValue } = get().generate;
          if (!inputType || !inputValue) {
            set((state) => { state.generate.error = '入力タイプと入力値は必須です。'; });
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
              const fileContent = await inputValue.text(); // Consider very large files
              apiInput = { inputType: 'text', inputValue: fileContent };
            } else if (inputType === 'url' && typeof inputValue === 'string') {
              apiInput = { inputType: 'url', inputValue: `${JINA_READER_URL_PREFIX}${inputValue}` };
            } else if (inputType === 'text' && typeof inputValue === 'string') {
              apiInput = { inputType: 'text', inputValue: inputValue };
            } else {
              throw new Error('無効な入力タイプまたは値です。');
            }

            const response = await fetch(API_ENDPOINTS.GENERATE_CARDS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiInput),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `APIエラー: ${response.statusText}`);
            }

            const result: GenerateFlashcardsOutput = await response.json();
            const cardsWithIds = result.cards.map(card => ({...card, id: crypto.randomUUID()}));

            set((state) => {
              state.generate.previewCards = cardsWithIds;
            });

          } catch (error: any) {
            console.error("プレビュー生成エラー:", error);
            set((state) => { state.generate.error = error.message || 'プレビューの生成に失敗しました。'; });
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
             Object.assign(state.generate, initialGenerateState);
             state.generate.cardSetTags = []; // Ensure these are reset too
             state.generate.previewCards = [];
         }),
      },

      // --- Library Store Implementation ---
      library: {
        ...initialLibraryStateWithoutHelpers,
        ...(initProps?.library),

        _applyFiltersAndUpdateDraft: (draftState) => {
            let sets = draftState.allCardSets;
            if (draftState.filterTheme) {
                sets = sets.filter(set => set.theme === draftState.filterTheme);
            }
            if (draftState.filterTags.length > 0) {
                 const tagSet = new Set(draftState.filterTags);
                 sets = sets.filter(set => set.tags.some(tag => tagSet.has(tag)));
            }
            if (!cardSetsAreEqual(draftState.filteredCardSets, sets)) {
                draftState.filteredCardSets = sets;
            }
        },

        setAllCardSets: (newAllCardSets) => {
          const currentAll = get().library.allCardSets;
          if (cardSetsAreEqual(currentAll, newAllCardSets)) {
            set(state => { state.library.isLoading = false; }); // Ensure loading is false if sets are same
            return;
          }
          set((state) => {
              state.library.allCardSets = newAllCardSets;
              state.library._applyFiltersAndUpdateDraft(state.library);
              state.library.isLoading = false;
          });
        },
        setAvailableThemes: (newThemes) => {
             const currentThemes = get().library.availableThemes;
             if (arraysAreEqual(currentThemes, newThemes)) {
                 return;
             }
             set((state) => { state.library.availableThemes = [...newThemes].sort(); });
        },
        setAvailableTags: (newTags) => {
            const currentTags = get().library.availableTags;
            if (arraysAreEqual(currentTags, newTags)) {
                 return;
            }
            set((state) => { state.library.availableTags = [...newTags].sort(); });
        },
        setFilterTheme: (theme) => {
          set((state) => {
            if (state.library.filterTheme === theme) return;
            state.library.filterTheme = theme;
            state.library._applyFiltersAndUpdateDraft(state.library);
          });
        },
        addFilterTag: (tag) => {
          set((state) => {
            if (!state.library.filterTags.includes(tag)) {
              state.library.filterTags.push(tag);
              state.library.filterTags.sort(); // Keep sorted for easier comparison
              state.library._applyFiltersAndUpdateDraft(state.library);
            }
          });
        },
        removeFilterTag: (tag) => {
          set((state) => {
            const initialLength = state.library.filterTags.length;
            state.library.filterTags = state.library.filterTags.filter(t => t !== tag);
            // No need to re-sort, filtering preserves order relative to itself
            if (state.library.filterTags.length !== initialLength) {
                state.library._applyFiltersAndUpdateDraft(state.library);
            }
          });
        },
        resetFilters: () => {
          set((state) => {
            let changed = false;
            if (state.library.filterTheme !== null) {
                state.library.filterTheme = null;
                changed = true;
            }
            if (state.library.filterTags.length > 0) {
                state.library.filterTags = [];
                changed = true;
            }
            if (changed) {
                state.library._applyFiltersAndUpdateDraft(state.library);
            }
          });
        },
      },

      // --- Study Store Implementation ---
      study: {
        ...initialStudyState,
        ...(initProps?.study),
        startStudySession: (cardSets) => set((state) => {
           const allCards = cardSets.flatMap(set => set.cards);
           const shuffledCards = [...allCards].sort(() => Math.random() - 0.5);

           Object.assign(state.study, initialStudyState); // Reset study state

           state.study.activeCardSetIds = cardSets.map(set => set.id);
           state.study.originalDeck = allCards;
           state.study.currentDeck = shuffledCards;
           state.study.currentCardIndex = shuffledCards.length > 0 ? 0 : -1;
           state.study.currentCard = shuffledCards.length > 0 ? shuffledCards[0] : null;
           state.study.isFrontVisible = true;
        }),
        flipCard: () => set((state) => {
             if (state.study.currentCard) {
                state.study.isFrontVisible = !state.study.isFrontVisible;
                if (state.study.isFrontVisible) { // When flipping back to front
                    state.study.currentHint = null;
                    state.study.currentDetails = null;
                    state.study.isHintLoading = false;
                    state.study.isDetailsLoading = false;
                    state.study.error = null;
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
                state.study.error = null;
            } else {
                // End of deck
                state.study.currentCardIndex = -1; // Indicate completion
                state.study.currentCard = null;
                 // Optionally keep other states or reset them
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
                state.study.error = null;
            }
        }),
        fetchHint: async () => {
           const currentCard = get().study.currentCard;
           if (!currentCard || get().study.isHintLoading || get().study.currentHint) return;

           set(state => { state.study.isHintLoading = true; state.study.error = null; });

           try {
               const input: RequestAiGeneratedHintInput = { front: currentCard.front, back: currentCard.back };
                const response = await fetch(API_ENDPOINTS.GENERATE_HINT, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(input),
                });
                 if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `APIエラー: ${response.statusText}`);
                }
                const result = await response.json();

               set(state => { state.study.currentHint = result.hint; });
           } catch (error: any) {
               console.error("ヒント取得エラー:", error);
               set(state => { state.study.error = error.message || 'ヒントの取得に失敗しました。'; });
           } finally {
               set(state => { state.study.isHintLoading = false; });
           }
        },
        fetchDetails: async () => {
           const currentCard = get().study.currentCard;
           if (!currentCard || get().study.isDetailsLoading || get().study.currentDetails) return;

            set(state => { state.study.isDetailsLoading = true; state.study.error = null; });

           try {
               const input: ProvideDetailedExplanationInput = { front: currentCard.front, back: currentCard.back };
                const response = await fetch(API_ENDPOINTS.GENERATE_DETAILS, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(input),
                });
                 if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `APIエラー: ${response.statusText}`);
                }
                const result = await response.json();

               set(state => { state.study.currentDetails = result.details; });
           } catch (error: any) {
               console.error("詳細取得エラー:", error);
               set(state => { state.study.error = error.message || '詳細の取得に失敗しました。'; });
           } finally {
               set(state => { state.study.isDetailsLoading = false; });
           }
        },
        clearHintAndDetails: () => set((state) => { // Typically called when card changes or visibility changes
            state.study.currentHint = null;
            state.study.currentDetails = null;
            state.study.isHintLoading = false;
            state.study.isDetailsLoading = false;
            state.study.error = null;
         }),
         shuffleDeck: () => set((state) => {
             state.study.currentDeck = [...state.study.originalDeck].sort(() => Math.random() - 0.5);
             state.study.currentCardIndex = state.study.currentDeck.length > 0 ? 0 : -1;
             state.study.currentCard = state.study.currentDeck.length > 0 ? state.study.currentDeck[0] : null;
             state.study.isFrontVisible = true;
             state.study.currentHint = null; // Reset hint/details on shuffle
             state.study.currentDetails = null;
             state.study.isHintLoading = false;
             state.study.isDetailsLoading = false;
             state.study.error = null;
        }),
        resetStudySession: () => set((state) => {
              Object.assign(state.study, initialStudyState);
              state.study.activeCardSetIds = []; // Ensure arrays are new
              state.study.originalDeck = [];
              state.study.currentDeck = [];
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
    throw new Error(`useStoreはStoreProvider内で使用する必要があります。`);
  }

  return useZustandStore(storeContext, selector);
};

// Initialize store function (used in provider)
export const initializeStore = (preloadedState: Partial<Store> = {}) =>
  createFlashGeniusStore(preloadedState);
