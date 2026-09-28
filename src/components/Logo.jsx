// CoreDesk mark: blue squircle, white open ring (gap at lower-left) around a solid core disc.
export default function Logo({ size = 32, className = "" }) {
  return (
    <svg
      className={"brand-logo " + className}
      viewBox="0 0 240 240"
      width={size}
      height={size}
      role="img"
      aria-label="CoreDesk"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="240" height="240" rx="56" fill="#0176D3" />
      <path
        d="M 61.2 153.95 A 67.9 67.9 0 1 1 90.2 181"
        stroke="#FFFFFF"
        strokeWidth="24.5"
        strokeLinecap="round"
      />
      <circle cx="120" cy="120" r="38.5" fill="#FFFFFF" />
    </svg>
  );
}
