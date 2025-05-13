import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-primary', className)}
      style={{ width: size, height: size }}
      aria-label="Loading..."
    />
  );
}

// Optional: Full page loading overlay
export function FullPageLoading({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <LoadingSpinner size={48} />
            {message && <p className="mt-4 text-lg text-muted-foreground">{message}</p>}
        </div>
    );
}
