import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

/**
 * Curricu:lr wordmark from the design package. Never rebuilt as HTML text.
 * The light variant is the default; the dark variant is swapped in by
 * `.cl-logo-*` rules in globals.css when the dark theme is active.
 */
export function Logo({ className }: LogoProps) {
  const base = import.meta.env.BASE_URL;
  return (
    <>
      <img
        src={`${base}curriculr-logo-auf-hell.svg`}
        alt="Curricu:lr"
        className={cn('cl-logo-hell', className)}
      />
      <img
        src={`${base}curriculr-logo-auf-dunkel.svg`}
        alt="Curricu:lr"
        className={cn('cl-logo-dunkel', className)}
      />
    </>
  );
}
