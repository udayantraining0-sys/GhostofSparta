'use client';

interface Props {
  variant?: 'default' | 'primary';
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function CyberButton({
  variant = 'default',
  onClick,
  children,
  className = '',
  disabled = false,
}: Props) {
  return (
    <button
      className={`cyber-button ${variant === 'primary' ? 'cyber-button-primary' : ''} ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
