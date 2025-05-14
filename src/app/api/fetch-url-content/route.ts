
import { type NextRequest, NextResponse } from 'next/server';
import { JINA_READER_URL_PREFIX } from '@/lib/constants';

const MAX_CONTENT_LENGTH = 500000; // To match frontend limit

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URLパラメータが必要です。' }, { status: 400 });
  }

  // Always prepend JINA_READER_URL_PREFIX to ensure Jina Reader is used for content extraction.
  // Jina Reader handles various URL formats, including those already starting with http(s)://.
  const fullUrlToFetch = `${JINA_READER_URL_PREFIX}${targetUrl}`;

  try {
    console.log(`Backend API: URL「${fullUrlToFetch}」からコンテンツを取得しています (Jina Reader経由)`);
    const response = await fetch(fullUrlToFetch, {
      headers: {
        'Accept': 'text/plain, text/markdown, text/html, */*', // Prefer text/markdown or text/plain
        // Jina might sometimes require specific headers for PDF processing,
        // but typically 'Accept' is sufficient for r.jina.ai.
        // 'X-Return-Format': 'text', // Example: If Jina had such an option
      }
    });

    if (!response.ok) {
      console.error(`Backend API: Jina Readerからの取得エラー - Status: ${response.status}, URL: ${fullUrlToFetch}`);
      const errorText = await response.text();
      // Try to parse errorText if it's JSON from Jina, otherwise use it as is.
      let details = errorText;
      try {
        const jinaError = JSON.parse(errorText);
        if (jinaError && jinaError.message) {
          details = jinaError.message;
        } else if (jinaError && jinaError.error && jinaError.error.message) {
            details = jinaError.error.message;
        }
      } catch (e) {
        // Not a JSON error, use raw text
      }
      return NextResponse.json({ error: `Jina ReaderからのURLコンテンツの取得に失敗しました: ${response.status} ${response.statusText}`, details }, { status: response.status });
    }

    let textContent = await response.text();

    if (textContent.length > MAX_CONTENT_LENGTH) {
      textContent = textContent.substring(0, MAX_CONTENT_LENGTH);
      // It's good practice to inform client if truncation happened server-side too, though client also truncates
      // For now, just truncate. Client will show its own warning.
    }
    
    console.log(`Backend API: Jina Readerからコンテンツを取得しました (最初の200文字): ${textContent.substring(0,200)}...`);

    return NextResponse.json({ content: textContent });

  } catch (error: any) {
    console.error(`Backend API: URL「${fullUrlToFetch}」のフェッチ中に内部エラーが発生しました:`, error);
    return NextResponse.json({ error: error.message || 'URLコンテンツの取得中にサーバーエラーが発生しました。' }, { status: 500 });
  }
}
