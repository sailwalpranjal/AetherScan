import { forwardRef } from 'react';
import clsx from 'clsx';

import type { InteractiveComponentProps } from '@/lib/types';
import styles from './Button.module.css';

// ==========================================
// BUTTON COMPONENT TYPES
// ==========================================

interface ButtonProps extends InteractiveComponentProps {
  readonly variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  readonly size?: 'sm' | 'md' | 'lg' | 'xl';
  readonly fullWidth?: boolean;
  readonly leftIcon?: React.ReactNode;
  readonly rightIcon?: React.ReactNode;
  readonly href?: string;
  readonly target?: '_blank' | '_self' | '_parent' | '_top';
  readonly rel?: string;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly form?: string;
  readonly download?: boolean | string;
}

// ==========================================
// BUTTON COMPONENT
// ==========================================

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled = false,
    loading = false,
    href,
    target,
    rel,
    type = 'button',
    form,
    download,
    onClick,
    onFocus,
    onBlur,
    onKeyDown,
    testId,
    ariaLabel,
    ariaDescribedBy,
    ...rest
  },
  ref
): React.JSX.Element {
  
  // ==========================================
  // CLASS NAMES
  // ==========================================
  
  const buttonClasses = clsx(
    styles['button'],
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    {
      'fullWidth': fullWidth,
      'disabled': disabled,
      'loading': loading,
      'withLeftIcon': leftIcon,
      'withRightIcon': rightIcon,
    },
    className
  );

  // ==========================================
  // COMMON PROPS
  // ==========================================
  
  const commonProps = {
    className: buttonClasses,
    disabled: disabled || loading,
    onClick,
    onFocus,
    onBlur,
    onKeyDown,
    'data-testid': testId,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
    ...rest,
  };

  // ==========================================
  // LOADING SPINNER
  // ==========================================
  
  const LoadingSpinner = (): React.JSX.Element => (
    <span className={styles['loadingSpinner']} aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  // ==========================================
  // BUTTON CONTENT
  // ==========================================
  
  const buttonContent = (
    <>
      {loading && <LoadingSpinner />}
      {!loading && leftIcon && (
        <span className={styles['leftIcon']} aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className={styles['content']}>
        {children}
      </span>
      {!loading && rightIcon && (
        <span className={styles['rightIcon']} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </>
  );

  // ==========================================
  // RENDER LINK OR BUTTON
  // ==========================================
  
  if (href) {
    const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
    const linkTarget = target || (isExternal ? '_blank' : '_self');
    const linkRel = rel || (isExternal ? 'noopener noreferrer' : undefined);

    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={disabled ? undefined : href}
        target={disabled ? undefined : linkTarget}
        rel={disabled ? undefined : linkRel}
        download={download}
        role="button"
        tabIndex={disabled ? -1 : 0}
        {...commonProps}
      >
        {buttonContent}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      form={form}
      {...commonProps}
    >
      {buttonContent}
    </button>
  );
});

Button.displayName = 'Button';