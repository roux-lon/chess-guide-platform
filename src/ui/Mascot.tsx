import type { Mood } from "@/features/mascot";

interface Props {
  mood?: Mood;
  /** Width in pixels. */
  size?: number;
  /**
   * What a screen reader should say, for example "Pip is cheering". Leave it out when the
   * picture is only decoration next to words that already say the same thing.
   */
  label?: string;
  className?: string;
}

const INK = "#1e1b3a";
const SPARKLE = "M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z";

/**
 * Pip, the coach: a little round-bellied bell with a leaf on top. Drawn from scratch as inline
 * SVG (no images to download, so it works offline), with four moods.
 */
export function Mascot({ mood = "happy", size = 96, label, className }: Props) {
  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {/* arms, behind the body */}
      <g fill="none" stroke="#6d4aff" strokeWidth="9" strokeLinecap="round">
        {mood === "cheering" && (
          <>
            <path d="M34 80 Q16 68 14 50" />
            <path d="M86 80 Q104 68 106 50" />
          </>
        )}
        {mood === "thinking" && (
          <>
            <path d="M34 84 Q22 92 24 104" />
            <path d="M86 84 Q106 76 82 58" />
          </>
        )}
        {mood === "oops" && (
          <>
            <path d="M34 84 Q20 80 18 66" />
            <path d="M86 84 Q100 80 102 66" />
          </>
        )}
        {mood === "happy" && (
          <>
            <path d="M34 84 Q22 92 24 104" />
            <path d="M86 84 Q98 92 96 104" />
          </>
        )}
      </g>

      {/* body */}
      <path
        d="M38 70 C34 88 22 98 20 114 Q20 123 30 123 H90 Q100 123 100 114 C98 98 86 88 82 70 Z"
        fill="#6d4aff"
      />
      <ellipse cx="60" cy="103" rx="20" ry="14" fill="#ece6ff" />
      <ellipse cx="60" cy="69" rx="27" ry="8" fill="#4b2fd1" />

      {/* head */}
      <circle cx="60" cy="40" r="30" fill="#f4f1ff" stroke="#6d4aff" strokeWidth="4" />

      {/* leaf */}
      <path d="M60 11 L60 6" stroke="#17703f" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 7 C60 -1 71 -4 77 2 C71 8 66 9 60 7 Z" fill="#2fb36b" />

      {/* cheeks */}
      <ellipse cx="41" cy="51" rx="6" ry="4" fill="#ff9ec2" opacity="0.75" />
      <ellipse cx="79" cy="51" rx="6" ry="4" fill="#ff9ec2" opacity="0.75" />

      {/* eyes and brows */}
      {mood === "happy" && (
        <>
          <circle cx="48" cy="38" r="5" fill={INK} />
          <circle cx="72" cy="38" r="5" fill={INK} />
          <circle cx="46.5" cy="36.4" r="1.7" fill="#fff" />
          <circle cx="70.5" cy="36.4" r="1.7" fill="#fff" />
        </>
      )}
      {mood === "thinking" && (
        <>
          <circle cx="48" cy="38" r="5" fill={INK} />
          <circle cx="72" cy="38" r="5" fill={INK} />
          <circle cx="50" cy="36" r="1.7" fill="#fff" />
          <circle cx="74" cy="36" r="1.7" fill="#fff" />
          <path d="M41 28 Q48 23 55 28" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M65 26 Q72 21 79 26" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mood === "oops" && (
        <>
          <circle cx="48" cy="39" r="7.5" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <circle cx="72" cy="39" r="7.5" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <circle cx="48" cy="40" r="2.8" fill={INK} />
          <circle cx="72" cy="40" r="2.8" fill={INK} />
          <path d="M39 31 L55 24" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M81 31 L65 24" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mood === "cheering" && (
        <>
          <path d="M42 41 Q48 32 54 41" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M66 41 Q72 32 78 41" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}

      {/* mouth */}
      {mood === "happy" && (
        <path d="M50 50 Q60 60 70 50" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      )}
      {mood === "thinking" && (
        <path d="M54 55 Q61 52 69 56" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      )}
      {mood === "oops" && (
        <path
          d="M48 57 Q53 51 58 57 T68 57 T73 55"
          fill="none"
          stroke={INK}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {mood === "cheering" && (
        <>
          <path d="M47 49 Q60 70 73 49 Z" fill={INK} />
          <ellipse cx="60" cy="60" rx="7" ry="4" fill="#ff7aa8" />
        </>
      )}

      {/* extras */}
      {mood === "thinking" && (
        <g fill="#6d4aff" opacity="0.85">
          <circle cx="96" cy="26" r="2.6" />
          <circle cx="104" cy="17" r="3.8" />
          <circle cx="113" cy="7" r="5.4" />
        </g>
      )}
      {mood === "oops" && (
        <path d="M97 14 Q104 26 97 31 Q90 26 97 14 Z" fill="#60a5fa" stroke="#2563eb" strokeWidth="1.5" />
      )}
      {mood === "cheering" && (
        <g fill="#f5a623">
          <path d={SPARKLE} transform="translate(12 22)" />
          <path d={SPARKLE} transform="translate(108 20) scale(0.8)" />
          <path d={SPARKLE} transform="translate(104 58) scale(0.6)" />
          <path d={SPARKLE} transform="translate(16 62) scale(0.6)" />
        </g>
      )}
    </svg>
  );
}
