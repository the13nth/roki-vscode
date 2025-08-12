import React, { useState, useEffect } from 'react';

interface SlidingTextProps {
  words: string[];
  className?: string;
  slideSpeed?: number;
  delayBetweenSlides?: number;
}

export function SlidingText({ 
  words, 
  className = '',
  slideSpeed = 800,
  delayBetweenSlides = 4000
}: SlidingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, slideSpeed / 2);
    }, delayBetweenSlides);

    return () => clearInterval(interval);
  }, [words.length, slideSpeed, delayBetweenSlides]);

  return (
    <span 
      className={`
        ${className} 
        inline-block 
        transition-all 
        ease-in-out
        ${isAnimating ? 'transform -translate-y-2 opacity-0' : 'transform translate-y-0 opacity-100'}
      `}
      style={{ 
        transitionDuration: `${slideSpeed}ms`,
      }}
    >
      {words[currentIndex]}
    </span>
  );
}
