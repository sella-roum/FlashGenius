import React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t py-4 px-4 sm:px-6">
      <div className="text-center text-sm text-muted-foreground">
        © {currentYear} FlashGenius. 無断複写・転載を禁じます。
      </div>
    </footer>
  );
}
