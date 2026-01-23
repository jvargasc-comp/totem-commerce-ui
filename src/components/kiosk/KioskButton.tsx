import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'lg' | 'xl';

export type KioskButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

const stylesFor = (variant: Variant, disabled?: boolean): React.CSSProperties => {
  const base: React.CSSProperties = {
    borderRadius: '18px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    boxShadow: '0 8px 24px rgba(0,0,0,.18)',
  };

  if (disabled) {
    return {
      ...base,
      background: 'rgba(233,238,246,.12)',
      color: 'rgba(233,238,246,.45)',
      borderColor: 'rgba(233,238,246,.08)',
      boxShadow: 'none',
    };
  }

  switch (variant) {
    case 'primary':
      return { ...base, background: 'var(--primary)', color: 'white' };

    case 'secondary':
      return {
        ...base,
        background: 'var(--surface-2)',
        color: 'var(--text)',
        borderColor: 'rgba(233,238,246,.10)',
      };

    case 'danger':
      return { ...base, background: 'var(--danger)', color: 'white' };

    case 'ghost':
    default:
      return {
        ...base,
        background: 'transparent',
        color: 'var(--text)',
        borderColor: 'rgba(233,238,246,.18)',
        boxShadow: 'none',
      };
  }
};

const sizeFor = (size: Size): React.CSSProperties => {
  if (size === 'xl') {
    return {
      minHeight: '64px',
      padding: '16px 18px',
      fontSize: 'var(--text-xl)',
    };
  }
  return {
    minHeight: '56px',
    padding: '14px 16px',
    fontSize: 'var(--text-lg)',
  };
};

export const KioskButton: React.FC<KioskButtonProps> = ({
  label,
  onClick,
  disabled,
  variant = 'primary',
  size = 'lg',
  leftIcon,
  rightIcon,
  className,
  ariaLabel,
}) => {
  return (
    <button
      type='button'
      className={`kioskTouch kioskNoSelect ${className ?? ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      style={{
        width: '100%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontWeight: 800,
        letterSpacing: '.2px',
        ...sizeFor(size),
        ...stylesFor(variant, disabled),
      }}
    >
      {leftIcon ? <span style={{ display: 'inline-flex' }}>{leftIcon}</span> : null}
      <span style={{ lineHeight: 1.1, textAlign: 'center' }}>{label}</span>
      {rightIcon ? <span style={{ display: 'inline-flex' }}>{rightIcon}</span> : null}
    </button>
  );
};
