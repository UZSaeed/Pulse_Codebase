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
  const baseStyle = "inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer active:scale-[0.97]";
  
  const variants = {
    primary: "bg-cyan-600 text-white rounded-full hover:bg-cyan-700 squishy-shadow hover:squishy-shadow-hover",
    secondary: "bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200",
    outline: "border-2 border-cyan-600 text-cyan-600 rounded-full hover:bg-cyan-600 hover:text-white",
    ghost: "text-slate-500 rounded-xl hover:text-cyan-600 hover:bg-cyan-50"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-7 py-3.5 text-lg"
  };

  const neonStyle = neon ? "accent-glow" : "";

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${neonStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
