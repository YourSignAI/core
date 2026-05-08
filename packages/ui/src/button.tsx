import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const palette: Record<Variant, string> = {
    primary: 'bg-violet-600 hover:bg-violet-700 text-white',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-50 border border-zinc-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${palette[variant]} ${props.className ?? ''}`}
    />
  );
}
