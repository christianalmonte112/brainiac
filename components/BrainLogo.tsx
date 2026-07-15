import Image from "next/image";

interface BrainLogoProps {
  className?: string;
  /** Render width/height in CSS pixels. Tailwind `h-*` / `w-*` on `className` override layout size. */
  size?: number;
}

/** Canonical Brainiac mark — framed brain with internal fold lines. */
export function BrainLogo({ className, size = 28 }: BrainLogoProps) {
  return (
    <Image
      src="/brainiac-logo.png"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}
