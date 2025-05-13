import type { Metadata } from 'next';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';

export const metadata: Metadata = {
  title: 'FlashGenius App', // More specific title for app sections
  description: 'Manage and study your flashcards',
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Consider adding a Sidebar component here if needed for navigation */}
      <div className="flex flex-col sm:gap-4 sm:py-4"> {/* Removed sm:pl-14 */}
         <Header />
          <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
             {children}
          </main>
          <Footer />
      </div>
    </div>
  );
}

