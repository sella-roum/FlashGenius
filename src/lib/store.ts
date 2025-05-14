
import { createContext, useContext } from 'react';
import { createStore, useStore as useZustandStore, type StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CardSet, Flashcard, GenerationOptions, Tag } from '@/types';
import { API_ENDPOINTS, MAX_FILE_SIZE_BYTES, ACCEPTED_MIME_TYPES } from '@/lib/constants';
// Removed JINA_READER_URL_PREFIX import as backend will handle it.
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
  warningMessage: string | null; // For messages like truncation warnings
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
}

interface LibraryActions {
  setAllCardSets: (sets: CardSet[]) => void;
  setAvailableThemes: (themes: string[]) => void;
  setAvailableTags: (tags: string[]) => void;
  setFilterTheme: (theme: string | null) => void;
  addFilterTag: (tag: string) => void;
  removeFilterTag: (tag: string) => void;
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
  fetchHint: (forceRegenerate?: boolean) => Promise<void>;
  hideHint: () => void;
  fetchDetails: (forceRegenerate?: boolean) => Promise<void>;
  hideDetails: () => void;
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
  inputType: 'text',
  inputValue: null,
  generationOptions: { cardType: 'term-definition', language: '日本語', additionalPrompt: '' },
  previewCards: [],
  isLoading: false,
  error: null,
  warningMessage: null,
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
  isLoading: true, // Start with loading true until data is fetched
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

// Helper for deep equality check on arrays of primitives
const arraysAreEqualPrimitive = (arr1?: readonly string[], arr2?: readonly string[]): boolean => {
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
  const sortedArr1 = [...arr1].sort();
  const sortedArr2 = [...arr2].sort();
  for (let i = 0; i < sortedArr1.length; i++) {
    if (sortedArr1[i] !== sortedArr2[i]) return false;
  }
  return true;
};

// Helper for deep equality check on card sets (simplified version)
const cardSetsAreEqual = (sets1?: readonly CardSet[], sets2?: readonly CardSet[]): boolean => {
    if (sets1 === sets2) return true;
    if (!sets1 || !sets2 || sets1.length !== sets2.length) return false;

    // Create comparable versions of sets (e.g., stringify or pick key fields)
    // This is a performance-sensitive area. For complex objects, consider libraries like fast-deep-equal.
    // For now, a JSON.stringify comparison is a common (though not always perfect) approach.
    // A more robust way is to compare key properties and sorted arrays.
    const normalizeSet = (set: CardSet) => ({
        id: set.id,
        name: set.name,
        theme: set.theme,
        tags: [...set.tags].sort(), // Sort tags for consistent comparison
        updatedAt: set.updatedAt?.getTime() ?? 0, // Compare timestamp
        cardCount: set.cards.length,
        // Don't compare all cards deeply here to avoid performance issues,
        // unless CardSet.updatedAt reliably reflects changes to cards.
    });

    const sortedSets1 = [...sets1].sort((a, b) => a.id.localeCompare(b.id)).map(normalizeSet);
    const sortedSets2 = [...sets2].sort((a, b) => a.id.localeCompare(b.id)).map(normalizeSet);

    for (let i = 0; i < sortedSets1.length; i++) {
        const s1 = sortedSets1[i];
        const s2 = sortedSets2[i];
        if (s1.id !== s2.id || s1.name !== s2.name || s1.theme !== s2.theme ||
            s1.updatedAt !== s2.updatedAt || s1.cardCount !== s2.cardCount ||
            !arraysAreEqualPrimitive(s1.tags, s2.tags)) {
            return false;
        }
    }
    return true;
};


const applyLibraryFilters = (allSets: readonly CardSet[], filterTheme: string | null, filterTags: readonly string[]): CardSet[] => {
    let sets = [...allSets]; // Create a mutable copy
    if (filterTheme) {
        sets = sets.filter(set => set.theme === filterTheme);
    }
    if (filterTags.length > 0) {
         const tagSet = new Set(filterTags);
         sets = sets.filter(set => set.tags.some(tag => tagSet.has(tag)));
    }
    return sets;
};


export const initializeStore = (initProps?: Partial<Store>): StoreApi<Store> => {
  const DEFAULT_PROPS: Store = {
    generate: { ...initialGenerateState } as GenerateState & GenerateActions, // Casting to include actions
    library: { ...initialLibraryState } as LibraryState & LibraryActions, // Casting to include actions
    study: { ...initialStudyState } as StudyState & StudyActions, // Casting to include actions
  };

  return createStore<Store>()(
    immer((set, get) => ({
      ...DEFAULT_PROPS,
      // Deep merge initProps if provided
      ...(initProps ? {
          generate: { ...DEFAULT_PROPS.generate, ...initProps.generate },
          library: { ...DEFAULT_PROPS.library, ...initProps.library },
          study: { ...DEFAULT_PROPS.study, ...initProps.study },
      } : {}),

      // --- Generate Store Implementation ---
      generate: {
        ...initialGenerateState, // Spread initial state for generate
        ...(initProps?.generate), // Spread any initial props for generate
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
            set((state) => { state.generate.error = '入力タイプと入力値は必須です。'; });
            return;
          }

          set((state) => {
            state.generate.isLoading = true;
            state.generate.error = null;
            state.generate.previewCards = [];
            state.generate.warningMessage = null;
          });

          const MAX_INPUT_CHAR_LENGTH = 500000; // Character limit for text inputs
          let wasTruncated = false;
          let finalApiInputValue: string;
          const originalInputType = inputType; // 'file', 'url', or 'text'

          try {
            if (originalInputType === 'file' && inputValue instanceof File) {
              const file = inputValue as File;
              if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
                finalApiInputValue = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string); // result is base64 data URI
                  reader.onerror = (error) => reject(error);
                  reader.readAsDataURL(file);
                });
                // Data URIs are not truncated here; Gemini handles media size limits.
              } else if (['text/plain', 'text/markdown'].includes(file.type) || !ACCEPTED_MIME_TYPES.includes(file.type)) {
                // For known text types or unsupported types, try reading as text.
                finalApiInputValue = await file.text();
                if (finalApiInputValue.length > MAX_INPUT_CHAR_LENGTH) {
                  finalApiInputValue = finalApiInputValue.substring(0, MAX_INPUT_CHAR_LENGTH);
                  wasTruncated = true;
                }
                if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
                    set(state => { state.generate.warningMessage = `サポートされていないファイルタイプ (${file.type}) ですが、テキストとして処理を試みました。`; });
                }
              } else {
                 // This case should ideally not be reached if dropzone `accept` is configured correctly
                 throw new Error(`サポートされていないファイルタイプ (${file.type}) です。`);
              }
            } else if (originalInputType === 'url' && typeof inputValue === 'string') {
              finalApiInputValue = inputValue; // URL is passed as is to the backend
            } else if (originalInputType === 'text' && typeof inputValue === 'string') {
              finalApiInputValue = inputValue;
              if (finalApiInputValue.length > MAX_INPUT_CHAR_LENGTH) {
                finalApiInputValue = finalApiInputValue.substring(0, MAX_INPUT_CHAR_LENGTH);
                wasTruncated = true;
              }
            } else {
              throw new Error('無効な入力タイプまたは値です。');
            }

            const apiInput: GenerateFlashcardsInput = {
                inputType: originalInputType!, // 'file', 'url', or 'text'
                inputValue: finalApiInputValue,
                generationOptions: {
                    cardType: generationOptions.cardType,
                    language: generationOptions.language,
                    additionalPrompt: generationOptions.additionalPrompt || undefined,
                }
            };

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
              if (wasTruncated && !state.generate.warningMessage) { // Only set if not already set by unsupported file type
                state.generate.warningMessage = `入力コンテンツが長すぎたため、最初の約${MAX_INPUT_CHAR_LENGTH.toLocaleString()}文字に切り詰められました。`;
              }
              // Backend truncation warnings would need to be passed in `result` if desired
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
             // Ensure deep copy for nested objects/arrays
             Object.assign(state.generate, {
                ...initialGenerateState,
                cardSetTags: [...initialGenerateState.cardSetTags], // new array instance
                previewCards: [...initialGenerateState.previewCards], // new array instance
                generationOptions: {...initialGenerateState.generationOptions}, // new object instance
             });
         }),
      },

      // --- Library Store Implementation ---
      library: {
        ...initialLibraryState, // Spread initial state for library
        ...(initProps?.library), // Spread any initial props for library
        setAllCardSets: (newAllCardSets) => {
            set((state) => {
                // Optimization: Only update if the data has actually changed
                if (cardSetsAreEqual(state.library.allCardSets, newAllCardSets)) {
                    // If data is same, but was loading, set loading to false.
                    if (state.library.isLoading) state.library.isLoading = false;
                    return;
                }
                state.library.allCardSets = newAllCardSets;
                state.library.filteredCardSets = applyLibraryFilters(newAllCardSets, state.library.filterTheme, state.library.filterTags);
                state.library.isLoading = false; // Data has been loaded/updated
            });
        },
        setAvailableThemes: (newThemes) => {
             set((state) => {
                const sortedNewThemes = [...new Set(newThemes)].sort();
                if (arraysAreEqualPrimitive(state.library.availableThemes, sortedNewThemes)) return;
                state.library.availableThemes = sortedNewThemes;
            });
        },
        setAvailableTags: (newTags) => {
            set((state) => {
                const sortedNewTags = [...new Set(newTags)].sort();
                if (arraysAreEqualPrimitive(state.library.availableTags, sortedNewTags)) return;
                state.library.availableTags = sortedNewTags;
            });
        },
        setFilterTheme: (theme) => {
            set((state) => {
                if (state.library.filterTheme === theme) return; // No change
                state.library.filterTheme = theme;
                state.library.filteredCardSets = applyLibraryFilters(state.library.allCardSets, theme, state.library.filterTags);
            });
        },
        addFilterTag: (tag) => {
            set((state) => {
                if (!state.library.filterTags.includes(tag)) {
                    const newTags = [...state.library.filterTags, tag].sort(); // Keep sorted for consistency if needed
                    state.library.filterTags = newTags;
                    state.library.filteredCardSets = applyLibraryFilters(state.library.allCardSets, state.library.filterTheme, newTags);
                }
            });
        },
        removeFilterTag: (tag) => {
            set((state) => {
                const initialLength = state.library.filterTags.length;
                const newTags = state.library.filterTags.filter(t => t !== tag);
                if (newTags.length !== initialLength) { // If a tag was actually removed
                    state.library.filterTags = newTags;
                    state.library.filteredCardSets = applyLibraryFilters(state.library.allCardSets, state.library.filterTheme, newTags);
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
                    state.library.filteredCardSets = applyLibraryFilters(state.library.allCardSets, null, []);
                }
            });
        },
      },

      // --- Study Store Implementation ---
      study: {
        ...initialStudyState, // Spread initial state for study
        ...(initProps?.study), // Spread any initial props for study
        startStudySession: (cardSets) => set((state) => {
           // Deep copy cards to prevent direct modification of library/DB versions
           const allCardsOriginal = cardSets.flatMap(set => set.cards.map(c => ({...c})));
           // Shuffle the copied cards
           const shuffledCards = [...allCardsOriginal].sort(() => Math.random() - 0.5);

           state.study.activeCardSetIds = cardSets.map(set => set.id);
           state.study.originalDeck = allCardsOriginal; // Store the original order/content if needed for restart
           state.study.currentDeck = shuffledCards;
           state.study.currentCardIndex = shuffledCards.length > 0 ? 0 : -1;
           const newCurrentCard = shuffledCards.length > 0 ? shuffledCards[0] : null;
           state.study.currentCard = newCurrentCard;
           state.study.isFrontVisible = true;
           // Initialize hint/details from card if they exist (cached from previous session)
           state.study.currentHint = newCurrentCard?.hint || null;
           state.study.currentDetails = newCurrentCard?.details || null;
           state.study.isHintLoading = false;
           state.study.isDetailsLoading = false;
           state.study.error = null;
        }),
        flipCard: () => set((state) => {
             if (state.study.currentCard) {
                state.study.isFrontVisible = !state.study.isFrontVisible;
                // When flipping, ensure the correct aux data (hint/details) is shown or cleared
                if (state.study.isFrontVisible) { // Flipped to Front
                    state.study.currentHint = state.study.currentCard?.hint || null; // Show cached hint if any
                    // state.study.currentDetails = null; // Optionally clear details when flipping to front
                } else { // Flipped to Back
                    state.study.currentDetails = state.study.currentCard?.details || null; // Show cached details if any
                    // state.study.currentHint = null; // Optionally clear hint when flipping to back
                }
            }
         }),
        nextCard: () => set((state) => {
            const nextIndex = state.study.currentCardIndex + 1;
             if (nextIndex < state.study.currentDeck.length) {
                state.study.currentCardIndex = nextIndex;
                const newCard = state.study.currentDeck[nextIndex];
                state.study.currentCard = newCard;
                state.study.isFrontVisible = true; // Always show front first on new card
                state.study.currentHint = newCard.hint || null; // Load cached hint
                state.study.currentDetails = newCard.details || null; // Load cached details
            } else {
                // End of deck
                state.study.currentCardIndex = -1; // Or some other indicator for session complete
                state.study.currentCard = null;
                state.study.isFrontVisible = true;
                state.study.currentHint = null;
                state.study.currentDetails = null;
            }
            // Reset loading/error states for the new card
            state.study.isHintLoading = false;
            state.study.isDetailsLoading = false;
            state.study.error = null;
        }),
        previousCard: () => set((state) => {
            const prevIndex = state.study.currentCardIndex - 1;
            if (prevIndex >= 0) {
                state.study.currentCardIndex = prevIndex;
                const newCard = state.study.currentDeck[prevIndex];
                state.study.currentCard = newCard;
                state.study.isFrontVisible = true; // Always show front first
                state.study.currentHint = newCard.hint || null; // Load cached hint
                state.study.currentDetails = newCard.details || null; // Load cached details
                state.study.isHintLoading = false;
                state.study.isDetailsLoading = false;
                state.study.error = null;
            }
        }),
        fetchHint: async (forceRegenerate = false) => {
           const { currentCard: cardFromGet, isHintLoading: currentIsHintLoading, currentHint: existingCurrentHint } = get().study;

           if (!cardFromGet || (currentIsHintLoading && !forceRegenerate)) return;

            // If not forcing and a hint exists on the card object (cached), use it.
            if (!forceRegenerate && cardFromGet.hint) {
                set(state => { state.study.currentHint = cardFromGet.hint; state.study.isHintLoading = false; state.study.error = null; });
                return;
            }
            // If not forcing and a hint is already displayed in currentHint (even if not yet saved to card.hint), and it's not an empty string.
            if (!forceRegenerate && existingCurrentHint) {
                 // No need to set state again if existingCurrentHint is already what we want.
                 // This prevents re-fetching if the user clicks "Show Hint" multiple times while hint is already shown.
                 return;
            }


           set(state => { state.study.isHintLoading = true; state.study.error = null; state.study.currentHint = null; }); // Clear current hint before fetching new one
           try {
               const input: RequestAiGeneratedHintInput = { front: cardFromGet.front, back: cardFromGet.back };
                const response = await fetch(API_ENDPOINTS.GENERATE_HINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
                 if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `APIエラー: ${response.statusText}`); }
                const result = await response.json();
               set(state => {
                 state.study.currentHint = result.hint;
                 // Cache the fetched hint on the card object in the currentDeck and originalDeck
                 const cardId = state.study.currentCard?.id;
                 if (cardId) {
                    const updateCardCache = (c: Flashcard) => { if (c.id === cardId) c.hint = result.hint; };
                    state.study.currentDeck.forEach(updateCardCache);
                    state.study.originalDeck.forEach(updateCardCache); // Also update original deck for restarts
                    if (state.study.currentCard) state.study.currentCard.hint = result.hint; // Ensure current card in state has it
                 }
               });
           } catch (error: any) {
               console.error("ヒント取得エラー:", error);
               set(state => { state.study.error = error.message || 'ヒントの取得に失敗しました。'; });
           } finally {
               set(state => { state.study.isHintLoading = false; });
           }
        },
        hideHint: () => set((state) => { state.study.currentHint = null; }),
        fetchDetails: async (forceRegenerate = false) => {
           const { currentCard: cardFromGet, isDetailsLoading: currentIsDetailsLoading, currentDetails: existingCurrentDetails } = get().study;
           if (!cardFromGet || (currentIsDetailsLoading && !forceRegenerate)) return;

            if (!forceRegenerate && cardFromGet.details) {
                set(state => { state.study.currentDetails = cardFromGet.details; state.study.isDetailsLoading = false; state.study.error = null; });
                return;
            }
            if (!forceRegenerate && existingCurrentDetails) {
                return;
            }

            set(state => { state.study.isDetailsLoading = true; state.study.error = null; state.study.currentDetails = null; });
           try {
               const input: ProvideDetailedExplanationInput = { front: cardFromGet.front, back: cardFromGet.back };
                 const response = await fetch(API_ENDPOINTS.GENERATE_DETAILS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
                 if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `APIエラー: ${response.statusText}`); }
                 const result = await response.json();
               set(state => {
                 state.study.currentDetails = result.details;
                 // Cache details on the card object
                 const cardId = state.study.currentCard?.id;
                 if (cardId) {
                    const updateCardCache = (c: Flashcard) => { if (c.id === cardId) c.details = result.details; };
                    state.study.currentDeck.forEach(updateCardCache);
                    state.study.originalDeck.forEach(updateCardCache);
                    if (state.study.currentCard) state.study.currentCard.details = result.details;
                 }
               });
           } catch (error: any) {
               console.error("詳細取得エラー:", error);
               set(state => { state.study.error = error.message || '詳細の取得に失敗しました。'; });
           } finally {
               set(state => { state.study.isDetailsLoading = false; });
           }
        },
        hideDetails: () => set((state) => { state.study.currentDetails = null; }),
        shuffleDeck: () => set((state) => {
             // Use the originalDeck to reshuffle, preserving original card data
             const newShuffledDeck = [...state.study.originalDeck].sort(() => Math.random() - 0.5);
             state.study.currentDeck = newShuffledDeck;
             state.study.currentCardIndex = newShuffledDeck.length > 0 ? 0 : -1;
             const newCard = newShuffledDeck.length > 0 ? newShuffledDeck[0] : null;
             state.study.currentCard = newCard;
             state.study.isFrontVisible = true;
             state.study.currentHint = newCard?.hint || null; // Load cached hint
             state.study.currentDetails = newCard?.details || null; // Load cached details
             state.study.isHintLoading = false;
             state.study.isDetailsLoading = false;
             state.study.error = null;
        }),
        resetStudySession: () => set((state) => {
              // Reset to initial study state, ensuring arrays are new instances
              Object.assign(state.study, {
                  ...initialStudyState,
                  activeCardSetIds: [...initialStudyState.activeCardSetIds],
                  originalDeck: [...initialStudyState.originalDeck],
                  currentDeck: [...initialStudyState.currentDeck],
              });
         }),
      },
    }))
  );
};

export const StoreContext = createContext<StoreApi<Store> | null>(null);

export const useStore = <T>(selector: (store: Store) => T): T => {
  const storeContext = useContext(StoreContext);
  if (!storeContext) {
    throw new Error(`useStoreはStoreProvider内で使用する必要があります。`);
  }
  return useZustandStore(storeContext, selector);
};

// Export the Store type for use in other parts of the application if needed
export type AppStoreApi = StoreApi<Store>;
