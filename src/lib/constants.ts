
export const SUPPORTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

export const ACCEPTED_FILE_EXTENSIONS = Object.values(SUPPORTED_FILE_TYPES).flat();
export const ACCEPTED_MIME_TYPES = Object.keys(SUPPORTED_FILE_TYPES);

export const API_ENDPOINTS = {
  GENERATE_CARDS: '/api/generate-cards',
  GENERATE_HINT: '/api/generate-hint',
  GENERATE_DETAILS: '/api/generate-details',
  FETCH_URL_CONTENT: '/api/fetch-url-content', // Added for URL proxy
};

export const JINA_READER_URL_PREFIX = 'https://r.jina.ai/'; // Still needed for backend proxy

export const MAX_FILE_SIZE_MB = 10; // Max file size in MB
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
