
import { createContext, useContext } from 'react';
import { createStore, useStore as useZustandStore, type StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CardSet, Flashcard, GenerationOptions, Tag } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';
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
  isLoading: true,
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

const cardSetsAreEqual = (sets1?: readonly CardSet[], sets2?: readonly CardSet[]): boolean => {
    if (sets1 === sets2) return true;
    if (!sets1 || !sets2 || sets1.length !== sets2.length) return false;
    const normalizeSet = (set: CardSet) => ({
        id: set.id, name: set.name, theme: set.theme,
        tags: [...set.tags].sort(), updatedAt: set.updatedAt?.getTime() ?? 0,
        cardCount: set.cards.length,
    });
    const sortedSets1 = [...sets1].sort((a, b) => a.id.localeCompare(b.id)).map(normalizeSet);
    const sortedSets2 = [...sets2].sort((a, b) => a.id.localeCompare(b.id)).map(normalizeSet);
    for (let i = 0; i < sortedSets1.length; i++) {
        const s1 = sortedSets1[i]; const s2 = sortedSets2[i];
        if (s1.id !== s2.id || s1.name !== s2.name || s1.theme !== s2.theme ||
            s1.updatedAt !== s2.updatedAt || s1.cardCount !== s2.cardCount ||
            !arraysAreEqualPrimitive(s1.tags, s2.tags)) {
            return false;
        }
    }
    return true;
};

const applyLibraryFilters = (allSets: readonly CardSet[], filterTheme: string | null, filterTags: readonly string[]): CardSet[] => {
    let sets = [...allSets];
    if (filterTheme) sets = sets.filter(set => set.theme === filterTheme);
    if (filterTags.length > 0) {
         const tagSet = new Set(filterTags);
         sets = sets.filter(set => set.tags.some(tag => tagSet.has(tag)));
    }
    return sets;
};

export const initializeStore = (initProps?: Partial<Store>): StoreApi<Store> => {
  const DEFAULT_PROPS: Store = {
    generate: { ...initialGenerateState } as GenerateState & GenerateActions,
    library: { ...initialLibraryState } as LibraryState & LibraryActions,
    study: { ...initialStudyState } as StudyState & StudyActions,
  };

  return createStore<Store>()(
    immer((set, get) => ({
      ...DEFAULT_PROPS,
      ...(initProps ? {
          generate: { ...DEFAULT_PROPS.generate, ...initProps.generate },
          library: { ...DEFAULT_PROPS.library, ...initProps.library },
          study: { ...DEFAULT_PROPS.study, ...initProps.study },
      } : {}),

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
            if (!state.generate.cardSetTags.includes(tag)) state.generate.cardSetTags.push(tag);
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
            state.generate.warningMessage = null; // Clear previous warnings
          });

          const MAX_INPUT_CHAR_LENGTH = 500000; // Approx 125k tokens, leaving room for prompt
          let wasTruncated = false;
          let finalApiInputValue: string;
          let finalApiInputType: 'text' | 'url' = 'text'; // What the API/flow will receive as inputType

          try {
            if (inputType === 'file' && inputValue instanceof File) {
              finalApiInputType = 'text'; // Files are sent as text content
              finalApiInputValue = await inputValue.text();
              if (finalApiInputValue.length > MAX_INPUT_CHAR_LENGTH) {
                finalApiInputValue = finalApiInputValue.substring(0, MAX_INPUT_CHAR_LENGTH);
                wasTruncated = true;
              }
            } else if (inputType === 'url' && typeof inputValue === 'string') {
              finalApiInputType = 'url'; // Send raw URL to backend
              finalApiInputValue = inputValue;
              // Content fetching and truncation for URLs will happen backend-side (in the flow)
            } else if (inputType === 'text' && typeof inputValue === 'string') {
              finalApiInputType = 'text';
              finalApiInputValue = inputValue;
              if (finalApiInputValue.length > MAX_INPUT_CHAR_LENGTH) {
                finalApiInputValue = finalApiInputValue.substring(0, MAX_INPUT_CHAR_LENGTH);
                wasTruncated = true;
              }
            } else {
              throw new Error('無効な入力タイプまたは値です。');
            }

            const apiInput: GenerateFlashcardsInput = {
                inputType: finalApiInputType, // This is 'text' or 'url'
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
              if (wasTruncated) {
                state.generate.warningMessage = `入力コンテンツが長すぎたため、最初の約${MAX_INPUT_CHAR_LENGTH.toLocaleString()}文字に切り詰められました。`;
              }
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
             Object.assign(state.generate, {
                ...initialGenerateState,
                cardSetTags: [...initialGenerateState.cardSetTags],
                previewCards: [...initialGenerateState.previewCards],
                generationOptions: {...initialGenerateState.generationOptions},
             });
         }),
      },

      library: {
        ...initialLibraryState,
        ...(initProps?.library),
        setAllCardSets: (newAllCardSets) => {
            set((state) => {
                if (cardSetsAreEqual(state.library.allCardSets, newAllCardSets)) {
                    if (state.library.isLoading) state.library.isLoading = false;
                    return;
                }
                state.library.allCardSets = newAllCardSets;
                state.library.filteredCardSets = applyLibraryFilters(newAllCardSets, state.library.filterTheme, state.library.filterTags);
                state.library.isLoading = false;
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
                if (state.library.filterTheme === theme) return;
                state.library.filterTheme = theme;
                state.library.filteredCardSets = applyLibraryFilters(state.library.allCardSets, theme, state.library.filterTags);
            });
        },
        addFilterTag: (tag) => {
            set((state) => {
                if (!state.library.filterTags.includes(tag)) {
                    const newTags = [...state.library.filterTags, tag].sort();
                    state.library.filterTags = newTags;
                    state.library.filteredCardSets = applyLibraryFilters(state.library.allCardSets, state.library.filterTheme, newTags);
                }
            });
        },
        removeFilterTag: (tag) => {
            set((state) => {
                const initialLength = state.library.filterTags.length;
                const newTags = state.library.filterTags.filter(t => t !== tag);
                if (newTags.length !== initialLength) {
                    state.library.filterTags = newTags;
                    state.library.filteredCardSets = applyLibraryFilters(state.library.allCardSets, state.library.filterTheme, newTags);
                }
            });
        },
        resetFilters: () => {
            set((state) => {
                let changed = false;
                if (state.library.filterTheme !== null) { state.library.filterTheme = null; changed = true; }
                if (state.library.filterTags.length > 0) { state.library.filterTags = []; changed = true; }
                if (changed) state.library.filteredCardSets = applyLibraryFilters(state.library.allCardSets, null, []);
            });
        },
      },

      study: {
        ...initialStudyState,
        ...(initProps?.study),
        startStudySession: (cardSets) => set((state) => {
           const allCardsOriginal = cardSets.flatMap(set => set.cards.map(c => ({...c})));
           const shuffledCards = [...allCardsOriginal].sort(() => Math.random() - 0.5);
           state.study.activeCardSetIds = cardSets.map(set => set.id);
           state.study.originalDeck = allCardsOriginal;
           state.study.currentDeck = shuffledCards;
           state.study.currentCardIndex = shuffledCards.length > 0 ? 0 : -1;
           const newCurrentCard = shuffledCards.length > 0 ? shuffledCards[0] : null;
           state.study.currentCard = newCurrentCard;
           state.study.isFrontVisible = true;
           state.study.currentHint = newCurrentCard?.hint || null;
           state.study.currentDetails = newCurrentCard?.details || null;
           state.study.isHintLoading = false;
           state.study.isDetailsLoading = false;
           state.study.error = null;
        }),
        flipCard: () => set((state) => {
             if (state.study.currentCard) {
                state.study.isFrontVisible = !state.study.isFrontVisible;
                if (state.study.isFrontVisible) {
                    state.study.currentHint = state.study.currentCard?.hint || null;
                } else {
                    state.study.currentDetails = state.study.currentCard?.details || null;
                }
            }
         }),
        nextCard: () => set((state) => {
            const nextIndex = state.study.currentCardIndex + 1;
             if (nextIndex < state.study.currentDeck.length) {
                state.study.currentCardIndex = nextIndex;
                const newCard = state.study.currentDeck[nextIndex];
                state.study.currentCard = newCard;
                state.study.isFrontVisible = true;
                state.study.currentHint = newCard.hint || null;
                state.study.currentDetails = newCard.details || null;
            } else {
                state.study.currentCardIndex = -1; state.study.currentCard = null;
                state.study.isFrontVisible = true; state.study.currentHint = null; state.study.currentDetails = null;
            }
            state.study.isHintLoading = false; state.study.isDetailsLoading = false; state.study.error = null;
        }),
        previousCard: () => set((state) => {
            const prevIndex = state.study.currentCardIndex - 1;
            if (prevIndex >= 0) {
                state.study.currentCardIndex = prevIndex;
                const newCard = state.study.currentDeck[prevIndex];
                state.study.currentCard = newCard;
                state.study.isFrontVisible = true;
                state.study.currentHint = newCard.hint || null;
                state.study.currentDetails = newCard.details || null;
                state.study.isHintLoading = false; state.study.isDetailsLoading = false; state.study.error = null;
            }
        }),
        fetchHint: async (forceRegenerate = false) => {
           const { currentCard: cardFromGet, isHintLoading: currentIsHintLoading, currentHint: existingCurrentHint } = get().study;
           if (!cardFromGet || (currentIsHintLoading && !forceRegenerate)) return;
            if (!forceRegenerate && cardFromGet.hint) { // Use card's cached hint if available and not forcing
                set(state => { state.study.currentHint = cardFromGet.hint; state.study.isHintLoading = false; state.study.error = null; });
                return;
            }
            if (!forceRegenerate && existingCurrentHint) { // If a hint is already displayed (even if not on card.hint yet) and not forcing, do nothing
                 return;
            }
           set(state => { state.study.isHintLoading = true; state.study.error = null; state.study.currentHint = null; });
           try {
               const input: RequestAiGeneratedHintInput = { front: cardFromGet.front, back: cardFromGet.back };
                const response = await fetch(API_ENDPOINTS.GENERATE_HINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
                 if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `APIエラー: ${response.statusText}`); }
                const result = await response.json();
               set(state => {
                 state.study.currentHint = result.hint;
                 const cardId = state.study.currentCard?.id;
                 if (cardId) {
                    const updateCardCache = (c: Flashcard) => { if (c.id === cardId) c.hint = result.hint; };
                    state.study.currentDeck.forEach(updateCardCache);
                    state.study.originalDeck.forEach(updateCardCache);
                    if (state.study.currentCard) state.study.currentCard.hint = result.hint;
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
            if (!forceRegenerate && cardFromGet.details) { // Use card's cached details
                set(state => { state.study.currentDetails = cardFromGet.details; state.study.isDetailsLoading = false; state.study.error = null; });
                return;
            }
            if (!forceRegenerate && existingCurrentDetails) { // If details already displayed and not forcing, do nothing
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
             const newShuffledDeck = [...state.study.originalDeck].sort(() => Math.random() - 0.5);
             state.study.currentDeck = newShuffledDeck;
             state.study.currentCardIndex = newShuffledDeck.length > 0 ? 0 : -1;
             const newCard = newShuffledDeck.length > 0 ? newShuffledDeck[0] : null;
             state.study.currentCard = newCard;
             state.study.isFrontVisible = true;
             state.study.currentHint = newCard?.hint || null;
             state.study.currentDetails = newCard?.details || null;
             state.study.isHintLoading = false; state.study.isDetailsLoading = false; state.study.error = null;
        }),
        resetStudySession: () => set((state) => {
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
  if (!storeContext) throw new Error(`useStoreはStoreProvider内で使用する必要があります。`);
  return useZustandStore(storeContext, selector);
};

export type AppStoreApi = StoreApi<Store>;
