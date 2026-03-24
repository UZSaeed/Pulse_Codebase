import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  neonHighlight?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', neonHighlight = false, onClick }) => {
  const highlight = neonHighlight ? 'border border-neon-blue/30 hover:border-neon-blue/80 transition-colors' : 'border border-navy-700';
  
  return (
    <div className={`bg-navy-800 rounded-xl p-6 ${highlight} shadow-lg ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};
