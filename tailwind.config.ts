import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ["var(--font-playfair)", "Playfair Display", "serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      colors: {
        cherry: {
          50: "#FBF0F2",
          100: "#F4D8DC",
          200: "#E5B0B8",
          300: "#C97583",
          400: "#A04757",
          500: "#A04757",
          600: "#8B3A47",
          700: "#722F37",
          800: "#5C2530",
          900: "#4A1C24",
        },
        cream: {
          50: "#FDF8F0",
          100: "#F9F1E3",
          200: "#F5E6D3",
          300: "#EDD9BC",
          400: "#D4B896",
        },
        ink: {
          900: "#2A1810",
          600: "#5C4A3D",
        },
        success: "#6B8E4E",
        warning: "#C77D3A",
        danger: "#A03030",
        background: "#FDF8F0",
        foreground: "#2A1810",
        border: "#EDD9BC",
        input: "#EDD9BC",
        ring: "#722F37",
        primary: {
          DEFAULT: "#722F37",
          foreground: "#FDF8F0",
        },
        secondary: {
          DEFAULT: "#F5E6D3",
          foreground: "#2A1810",
        },
        muted: {
          DEFAULT: "#F9F1E3",
          foreground: "#5C4A3D",
        },
        accent: {
          DEFAULT: "#A04757",
          foreground: "#FDF8F0",
        },
        destructive: {
          DEFAULT: "#A03030",
          foreground: "#FDF8F0",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2A1810",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#2A1810",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(74, 28, 36, 0.08)",
        warm: "0 8px 30px rgba(74, 28, 36, 0.12)",
        cherry: "0 6px 24px rgba(114, 47, 55, 0.18)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
