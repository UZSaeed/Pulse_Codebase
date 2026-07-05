import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  neonHighlight?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', neonHighlight = false, onClick }) => {
  const highlight = neonHighlight
    ? 'border-2 border-cyan-600/30 hover:border-cyan-600/60 transition-colors'
    : 'border border-slate-200';
  
  return (
    <div className={`bg-white rounded-2xl p-6 ${highlight} squishy-shadow ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};
