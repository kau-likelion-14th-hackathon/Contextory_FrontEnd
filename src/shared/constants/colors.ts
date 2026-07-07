export const palette = {
  delicatePine: "#5A8782",
  magicMint: "#A6F2D5",
  vintageDarkBlue: "#253344",
  mirage: "#0F1C2E",
  fullWhite: "#FFFFFF",
} as const;

export const gray = {
  50: "#F9FAFB",
  100: "#F3F4F6",
  200: "#E5E7EB",
  400: "#9CA3AF",
  500: "#6B7280",
  900: "#111827",
} as const;

export const colors = {
  primary: palette.delicatePine,
  secondary: palette.magicMint,

  background: palette.fullWhite,
  surface: palette.fullWhite,

  textPrimary: palette.mirage,
  textSecondary: palette.vintageDarkBlue,
  textMuted: gray[500],
  textOnPrimary: palette.fullWhite,

  border: gray[200],
  disabled: gray[100],
} as const;
