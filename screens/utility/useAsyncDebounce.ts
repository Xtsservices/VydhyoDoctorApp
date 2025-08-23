import { useRef } from 'react';

export function useAsyncDebounce(callback: () => Promise<void>, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);
  };
}
