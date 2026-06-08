import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
    const [passwordVisible, setPasswordVisible] = React.useState(false);
    const isPassword = props.type === 'password';
    const trailingIcon = isPassword ? (
      <button
        type="button"
        className={styles.passwordToggle}
        onClick={() => setPasswordVisible((visible) => !visible)}
        aria-label={passwordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        title={passwordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
      >
        {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    ) : rightIcon;

    const inputClasses = [
      styles.input,
      error ? styles.error : '',
      leftIcon ? styles.withLeftIcon : '',
      trailingIcon ? styles.withRightIcon : '',
      className
    ].filter(Boolean).join(" ");

    return (
      <div className={styles.wrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.inputContainer}>
          {leftIcon && <div className={styles.iconLeft}>{leftIcon}</div>}
          <input
            ref={ref}
            disabled={disabled}
            className={inputClasses}
            autoCorrect={isPassword ? 'off' : props.autoCorrect}
            autoCapitalize={isPassword ? 'none' : props.autoCapitalize}
            {...props}
            type={isPassword && passwordVisible ? 'text' : props.type}
            autoComplete={
              props.autoComplete ?? (isPassword ? 'current-password' : undefined)
            }
          />
          {trailingIcon && <div className={styles.iconRight}>{trailingIcon}</div>}
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
