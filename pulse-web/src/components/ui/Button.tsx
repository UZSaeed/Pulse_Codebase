import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  neon?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  neon = false,
  className = '',
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 cursor-pointer";
  
  const variants = {
    primary: "bg-neon-blue text-navy-900 hover:bg-neon-blue-hover",
    secondary: "bg-navy-700 text-slate-100 hover:bg-navy-800",
    outline: "border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-navy-900",
    ghost: "text-slate-300 hover:text-neon-blue hover:bg-navy-800"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  const neonStyle = neon ? "neon-shadow neon-border" : "";

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${neonStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
