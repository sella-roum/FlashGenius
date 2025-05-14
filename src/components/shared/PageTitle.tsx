import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <div className="mb-8"> {/* Increased bottom margin */}
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1> {/* Adjusted font size and weight */}
      {subtitle && <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>} {/* Adjusted subtitle style */}
    </div>
  );
}
