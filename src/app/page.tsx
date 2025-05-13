'use client'; // Required for redirect

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function RootPage() {
  useEffect(() => {
    redirect('/dashboard');
  }, []);

  // Render minimal content while redirecting
  return <div className="flex h-screen items-center justify-center">Loading...</div>;
}
