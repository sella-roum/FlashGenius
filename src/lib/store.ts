
import { createContext, useContext } from 'react';
import { createStore, useStore as useZustandStore, type StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CardSet, Flashcard, GenerationOptions, Tag } from '@/types';
import { API_ENDPOINTS, MAX_FILE_SIZE_BYTES, ACCEPTED_MIME_TYPES, JINA_READER_URL_PREFIX } from '@/lib/constants';
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

    const normalizeSet = (set: CardSet) => ({
        id: set.id,
        name: set.name,
        theme: set.theme,
        tags: [...set.tags].sort(),
        updatedAt: set.updatedAt?.getTime() ?? 0,
        cardCount: set.cards.length,
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
    let sets = [...allSets];
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
            if (!state.generate.cardSetTags.includes(tag)) {
                state.generate.cardSetTags.push(tag);
            }
        }),
        removeCardSetTag: (tag) => set((state) => {
            state.generate.cardSetTags = state.generate.cardSetTags.filter(t => t !== tag);
        }),
        generatePreview: async () => {
          const { inputType, inputValue, generationOptions } = get().generate;
          if (!inputType || (!inputValue && typeof inputValue !== 'string')) { // Allow empty string for text/URL input
            set((state) => { state.generate.error = '入力タイプと入力値は必須です。'; });
            return;
          }

          set((state) => {
            state.generate.isLoading = true;
            state.generate.error = null;
            state.generate.previewCards = [];
            state.generate.warningMessage = null;
          });

          const MAX_INPUT_CHAR_LENGTH = 500000;
          let wasTruncated = false;
          let finalApiInputValue: string;
          let finalApiInputType: 'file' | 'text'; // 'url' will be converted to 'text'

          try {
            if (inputType === 'file' && inputValue instanceof File) {
              const file = inputValue;
              finalApiInputType = 'file'; // Stays 'file' for backend to differentiate data URI vs text content from file
              if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
                finalApiInputValue = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = (error) => reject(error);
                  reader.readAsDataURL(file);
                });
              } else if (['text/plain', 'text/markdown'].includes(file.type) || !ACCEPTED_MIME_TYPES.includes(file.type)) {
                finalApiInputValue = await file.text();
                if (finalApiInputValue.length > MAX_INPUT_CHAR_LENGTH) {
                  finalApiInputValue = finalApiInputValue.substring(0, MAX_INPUT_CHAR_LENGTH);
                  wasTruncated = true;
                }
                if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
                    set(state => { state.generate.warningMessage = `サポートされていないファイルタイプ (${file.type}) ですが、テキストとして処理を試みました。`; });
                }
              } else {
                 throw new Error(`サポートされていないファイルタイプ (${file.type}) です。`);
              }
            } else if (inputType === 'url' && typeof inputValue === 'string') {
              if (!inputValue.trim()) {
                set((state) => { state.generate.error = 'URLを入力してください。'; state.generate.isLoading = false; });
                return;
              }
              const fullUrlToFetch = inputValue.startsWith('http') ? inputValue : `${JINA_READER_URL_PREFIX}${inputValue}`;
              console.log(`Frontend: URL「${fullUrlToFetch}」からコンテンツを取得しています`);
              const response = await fetch(fullUrlToFetch);
              if (!response.ok) {
                throw new Error(`Jina AI からのURLコンテンツの取得に失敗しました: ${response.status} ${response.statusText}`);
              }
              let textContent = await response.text();
              if (textContent.length > MAX_INPUT_CHAR_LENGTH) {
                textContent = textContent.substring(0, MAX_INPUT_CHAR_LENGTH);
                wasTruncated = true;
              }
              finalApiInputValue = textContent;
              finalApiInputType = 'text'; // URL content is now treated as text for the backend
            } else if (inputType === 'text' && typeof inputValue === 'string') {
              finalApiInputValue = inputValue;
              if (finalApiInputValue.length > MAX_INPUT_CHAR_LENGTH) {
                finalApiInputValue = finalApiInputValue.substring(0, MAX_INPUT_CHAR_LENGTH);
                wasTruncated = true;
              }
              finalApiInputType = 'text';
            } else {
              throw new Error('無効な入力タイプまたは値です。');
            }

            const apiInput: GenerateFlashcardsInput = {
                inputType: finalApiInputType,
                inputValue: finalApiInputValue,
                generationOptions: {
                    cardType: generationOptions.cardType,
                    language: generationOptions.language,
                    additionalPrompt: generationOptions.additionalPrompt || undefined,
                }
            };

            const backendResponse = await fetch(API_ENDPOINTS.GENERATE_CARDS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiInput),
            });

            if (!backendResponse.ok) {
              const errorData = await backendResponse.json();
              throw new Error(errorData.error || `APIエラー: ${backendResponse.statusText}`);
            }

            const result: GenerateFlashcardsOutput = await backendResponse.json();
            const cardsWithIds = result.cards.map(card => ({...card, id: crypto.randomUUID()}));

            set((state) => {
              state.generate.previewCards = cardsWithIds;
              if (wasTruncated && !state.generate.warningMessage) {
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
                state.study.currentCardIndex = -1;
                state.study.currentCard = null;
                state.study.isFrontVisible = true;
                state.study.currentHint = null;
                state.study.currentDetails = null;
            }
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
                state.study.isFrontVisible = true;
                state.study.currentHint = newCard.hint || null;
                state.study.currentDetails = newCard.details || null;
                state.study.isHintLoading = false;
                state.study.isDetailsLoading = false;
                state.study.error = null;
            }
        }),
        fetchHint: async (forceRegenerate = false) => {
           const { currentCard: cardFromGet, isHintLoading: currentIsHintLoading, currentHint: existingCurrentHint } = get().study;

           if (!cardFromGet || (currentIsHintLoading && !forceRegenerate)) return;

            if (!forceRegenerate && cardFromGet.hint) {
                set(state => { state.study.currentHint = cardFromGet.hint; state.study.isHintLoading = false; state.study.error = null; });
                return;
            }
            if (!forceRegenerate && existingCurrentHint) {
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
             state.study.isHintLoading = false;
             state.study.isDetailsLoading = false;
             state.study.error = null;
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
  if (!storeContext) {
    throw new Error(`useStoreはStoreProvider内で使用する必要があります。`);
  }
  return useZustandStore(storeContext, selector);
};

export type AppStoreApi = StoreApi<Store>;
