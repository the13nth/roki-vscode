import React from 'react';
import { cn } from '@/lib/utils';

interface DotMatrixBackgroundProps {
  className?: string;
  dotSize?: 'xs' | 'sm' | 'md';
  spacing?: 'tight' | 'normal' | 'wide';
  opacity?: 'faint' | 'light' | 'medium';
}

export function DotMatrixBackground({ 
  className = '',
  dotSize = 'xs',
  spacing = 'normal',
  opacity = 'faint'
}: DotMatrixBackgroundProps) {
  const dotSizes = {
    xs: '1px',
    sm: '2px', 
    md: '3px'
  };

  const spacings = {
    tight: '12px',
    normal: '16px',
    wide: '24px'
  };

  const opacities = {
    faint: '0.2',
    light: '0.35',
    medium: '0.5'
  };

  const dotPattern = {
    backgroundImage: `radial-gradient(circle, rgba(71, 85, 105, ${opacities[opacity]}) ${dotSizes[dotSize]}, transparent ${dotSizes[dotSize]})`,
    backgroundSize: `${spacings[spacing]} ${spacings[spacing]}`,
    backgroundPosition: '0 0',
    backgroundRepeat: 'repeat'
  };

  return (
    <div 
      className={cn(
        'fixed inset-0 pointer-events-none z-0',
        className
      )}
      style={dotPattern}
    />
  );
}
