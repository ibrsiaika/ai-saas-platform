import React from 'react';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ 
  orientation = 'horizontal', 
  className = '' 
}) => {
  if (orientation === 'vertical') {
    return (
      <div className={`w-px bg-gray-200 ${className}`} />
    );
  }
  
  return (
    <div className={`h-px bg-gray-200 ${className}`} />
  );
};