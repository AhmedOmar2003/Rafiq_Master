import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, disabled, ...props }, ref) => {
    
    const inputClasses = [
      styles.input,
      error ? styles.error : '',
      leftIcon ? styles.withLeftIcon : '',
      rightIcon ? styles.withRightIcon : '',
      className
    ].filter(Boolean).join(" ");

    return (
      <div className={styles.wrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.inputContainer}>
          {leftIcon && <div className={styles.iconLeft}>{leftIcon}</div>}
          <input ref={ref} disabled={disabled} className={inputClasses} {...props} />
          {rightIcon && <div className={styles.iconRight}>{rightIcon}</div>}
        </div>
        {(error || helperText) && (
          <p className={`${styles.helperText} ${error ? styles.helperTextError : ''}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
