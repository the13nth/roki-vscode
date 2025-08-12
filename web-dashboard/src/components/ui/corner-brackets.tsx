import React from 'react';
import { cn } from '@/lib/utils';

interface CornerBracketsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function CornerBrackets({ 
  className = '', 
  size = 'md',
  color = 'border-gray-700'
}: CornerBracketsProps) {
  // Generate random lengths for each corner bracket
  const getRandomLength = () => {
    const lengths = ['w-2 h-2', 'w-3 h-3', 'w-4 h-4', 'w-5 h-5', 'w-6 h-6'];
    return lengths[Math.floor(Math.random() * lengths.length)];
  };

  // Generate different random lengths for each bracket
  const topLeftSize = getRandomLength();
  const topRightSize = getRandomLength();
  const bottomLeftSize = getRandomLength();
  const bottomRightSize = getRandomLength();

  return (
    <>
      {/* Top Left Corner - Points outward (└ shape) */}
      <div className={cn(
        'absolute top-0 left-0 border-l-2 border-t-2',
        topLeftSize,
        color,
        className
      )} />
      
      {/* Top Right Corner - Points outward (┘ shape) */}
      <div className={cn(
        'absolute top-0 right-0 border-r-2 border-t-2',
        topRightSize,
        color,
        className
      )} />
      
      {/* Bottom Left Corner - Points outward (┌ shape) */}
      <div className={cn(
        'absolute bottom-0 left-0 border-l-2 border-b-2',
        bottomLeftSize,
        color,
        className
      )} />
      
      {/* Bottom Right Corner - Points outward (┐ shape) */}
      <div className={cn(
        'absolute bottom-0 right-0 border-r-2 border-b-2',
        bottomRightSize,
        color,
        className
      )} />
    </>
  );
}
