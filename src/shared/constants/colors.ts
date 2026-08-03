export const palette = {
  ink: "#17202A",
  blue: "#2563EB",
  teal: "#0F766E",
  amber: "#B45309",
  red: "#B91C1C",
  fullWhite: "#FFFFFF",
} as const;

export const gray = {
  50: "#F9FAFB",
  100: "#F3F4F6",
  200: "#E5E7EB",
  300: "#D1D5DB",
  400: "#9CA3AF",
  500: "#6B7280",
  700: "#374151",
  900: "#111827",
} as const;

export const colors = {
  primary: palette.blue,
  secondary: palette.teal,
  warning: palette.amber,
  danger: palette.red,

  background: palette.fullWhite,
  surface: palette.fullWhite,
  surfaceMuted: gray[50],

  textPrimary: palette.ink,
  textSecondary: gray[700],
  textMuted: gray[500],
  textOnPrimary: palette.fullWhite,

  border: gray[200],
  borderStrong: gray[300],
  disabled: gray[100],
} as const;
