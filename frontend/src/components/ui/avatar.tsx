import React from 'react';

interface AvatarProps {
  children: React.ReactNode;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ${className}`}>
      {children}
    </div>
  );
};

interface AvatarFallbackProps {
  children: React.ReactNode;
  className?: string;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({ children, className = '' }) => {
  return (
    <span className={`text-sm font-medium text-gray-600 ${className}`}>
      {children}
    </span>
  );
};