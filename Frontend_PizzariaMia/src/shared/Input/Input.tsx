import React, { type InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // You can add custom props here if needed later (e.g. error, label)
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <div className="custom-input-wrapper">
      <input 
        className={`custom-input ${className}`} 
        {...props} 
      />
    </div>
  );
}
