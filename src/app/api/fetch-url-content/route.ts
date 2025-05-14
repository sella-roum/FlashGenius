
import { type NextRequest, NextResponse } from 'next/server';
import { JINA_READER_URL_PREFIX } from '@/lib/constants';

const MAX_CONTENT_LENGTH = 500000; // To match frontend limit

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URLパラメータが必要です。' }, { status: 400 });
  }

  const fullUrlToFetch = targetUrl.startsWith('http') ? targetUrl : `${JINA_READER_URL_PREFIX}${targetUrl}`;

  try {
    console.log(`Backend API: URL「${fullUrlToFetch}」からコンテンツを取得しています`);
    const response = await fetch(fullUrlToFetch, {
      headers: {
        'Accept': 'text/plain, text/markdown, */*', // Prefer text/markdown
      }
    });

    if (!response.ok) {
      console.error(`Backend API: Jina Readerからの取得エラー - Status: ${response.status}, URL: ${fullUrlToFetch}`);
      const errorText = await response.text();
      return NextResponse.json({ error: `Jina ReaderからのURLコンテンツの取得に失敗しました: ${response.status} ${response.statusText}`, details: errorText }, { status: response.status });
    }

    let textContent = await response.text();

    if (textContent.length > MAX_CONTENT_LENGTH) {
      textContent = textContent.substring(0, MAX_CONTENT_LENGTH);
      // It's good practice to inform client if truncation happened server-side too, though client also truncates
      // For now, just truncate. Client will show its own warning.
    }
    
    // Log a snippet of the fetched content for debugging
    console.log(`Backend API: Jina Readerからコンテンツを取得しました (最初の200文字): ${textContent.substring(0,200)}...`);

    return NextResponse.json({ content: textContent });

  } catch (error: any) {
    console.error(`Backend API: URL「${fullUrlToFetch}」のフェッチ中に内部エラーが発生しました:`, error);
    return NextResponse.json({ error: error.message || 'URLコンテンツの取得中にサーバーエラーが発生しました。' }, { status: 500 });
  }
}
