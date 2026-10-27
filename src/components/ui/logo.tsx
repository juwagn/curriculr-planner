import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

/**
 * The wordmark files carry ~24 % empty space left and right of the lettering
 * (220 x 40 viewBox). `aspect-[3/1] object-cover` trims it so the logo aligns
 * with surrounding content without editing the package files.
 *
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
        className={cn('cl-logo-hell aspect-[3/1] object-cover', className)}
      />
      <img
        src={`${base}curriculr-logo-auf-dunkel.svg`}
        alt="Curricu:lr"
        className={cn('cl-logo-dunkel aspect-[3/1] object-cover', className)}
      />
    </>
  );
}
