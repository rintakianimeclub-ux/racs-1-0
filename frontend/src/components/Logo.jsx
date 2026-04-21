import React from "react";

export const LOGO_URL = "https://rintaki.org/wp-content/uploads/2026/04/racs-logo.png";

/**
 * Circular club logo badge, neo-brutalist style.
 * size = pixel diameter. Useful in headers, cards, hero.
 */
export function Logo({ size = 40, className = "", ring = "bg-[var(--primary)]", padded = true, ...rest }) {
  return (
    <div
      className={`shrink-0 ${ring} border-2 border-black rounded-full flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      {...rest}
    >
      <img
        src={LOGO_URL}
        alt="Rintaki Anime Club Society"
        className={`${padded ? "p-[2px]" : ""} w-full h-full object-contain`}
        draggable={false}
      />
    </div>
  );
}

export default Logo;
