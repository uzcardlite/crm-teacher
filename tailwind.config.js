/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "#12182B",
          text: "#C7C9D6",
          active: "#F5A623",
          "active-text": "#412402",
          // One step lighter than the sidebar background — replaces `bg-white/5`.
          hover: "#1E2436",
          // Divider inside the sidebar — replaces `border-white/10`.
          border: "#292F40",
        },
        background: "rgb(var(--page-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
          sunken: "rgb(var(--surface-sunken) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          strong: "rgb(var(--line-strong) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--fg) / <alpha-value>)",
          secondary: "rgb(var(--fg-secondary) / <alpha-value>)",
          muted: "rgb(var(--fg-muted) / <alpha-value>)",
          faint: "rgb(var(--fg-faint) / <alpha-value>)",
        },
        purple: { DEFAULT: "#6D28D9", light: "#A78BFA", dark: "#4C1D95" },
        accent: {
          DEFAULT: "#F5A623",
          light: "#FAC775",
          dark: "#854F0B",
          // Near-black brown for text/icons sitting ON the gold gradient —
          // the readable ink on gilt. Both themes.
          fg: "#2A1B06",
        },
        // Feruza (turquoise) — the Samarkand-tile secondary. Sits beside the
        // gold accent the way glazed tile sits against gilt on a madrasa
        // portal. Same both themes, like accent. `bg` is the tinted chip fill.
        secondary: {
          DEFAULT: "#12897F",
          light: "#3AC7BB",
          dark: "#0B5F58",
          bg: "#D6EFEC",
        },
        // Terrakota (fired-clay warmth) — third motif colour, used sparingly.
        clay: {
          DEFAULT: "#B85B30",
          light: "#D98552",
          dark: "#8A3F1F",
          bg: "#F7E6DC",
        },
        // Kechikdi / "late" — the amber-warning semantic, distinct from the
        // gold accent so a status never reads as a primary action.
        warning: {
          DEFAULT: "#B87A12",
          bg: "#FBF0D5",
        },
        success: {
          DEFAULT: "#0F6E56",
          bg: "#E1F5EE",
        },
        danger: {
          DEFAULT: "#A32D2D",
          bg: "#FCEBEB",
        },
        // Semantic informational hue (categories, neutral highlights). Values
        // match scheduleBlock.blue so nothing changes visually, but components
        // no longer borrow a calendar-block token for a semantic purpose.
        info: {
          DEFAULT: "#1D4ED8",
          bg: "#DBEAFE",
        },
        scheduleBlock: {
          teal: { bg: "#CCFBF1", text: "#0F766E", border: "#5EEAD4" },
          blue: { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" },
          violet: { bg: "#EDE9FE", text: "#6D28D9", border: "#C4B5FD" },
          rose: { bg: "#FFE4E6", text: "#BE123C", border: "#FDA4AF" },
          amber: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
          green: { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" },
          pink: { bg: "#FCE7F3", text: "#BE185D", border: "#F9A8D4" },
        },
      },
      borderRadius: {
        // Softer, more modern radii — cards and controls read as tactile
        // "pebbles" rather than sharp panels (iOS / Telegram feel).
        card: "18px",
        btn: "12px",
      },
      backgroundImage: {
        "gradient-blue": "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
        "gradient-green": "linear-gradient(135deg, #10B981 0%, #0F6E56 100%)",
        "gradient-orange": "linear-gradient(135deg, #CE7C0E 0%, #8A4E08 100%)",
        "gradient-purple": "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
        "gradient-rose": "linear-gradient(135deg, #FB7185 0%, #BE123C 100%)",
        "gradient-teal": "linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)",
        // Brand gradients for the redesign: warm gilt and glazed feruza. Used
        // on the primary action, the salary hero, and stat cards.
        "gradient-gold": "linear-gradient(135deg, #FFCE63 0%, #F2A11F 100%)",
        // Deep glazed feruza — dark enough that white text stays legible
        // across the whole sweep (the bright mint it started as failed WCAG on
        // its light end), and closer to real Samarkand tile besides.
        "gradient-feruza": "linear-gradient(135deg, #12897F 0%, #0B5F58 100%)",
        "gradient-clay": "linear-gradient(135deg, #D98552 0%, #B0532A 100%)",
        // Dark-mode stat gradients, brightened one step for a more vivid,
        // premium read while white text stays AA on the lighter (top-left)
        // stop.
        "gradient-blue-dark": "linear-gradient(135deg, #2653C9 0%, #1B3A8F 100%)",
        "gradient-green-dark": "linear-gradient(135deg, #07724F 0%, #0A5540 100%)",
        "gradient-orange-dark": "linear-gradient(135deg, #A85A0C 0%, #713A08 100%)",
        "gradient-purple-dark": "linear-gradient(135deg, #6A2CC4 0%, #4A1C93 100%)",
        "gradient-rose-dark": "linear-gradient(135deg, #A81745 0%, #7A0F2C 100%)",
        "gradient-teal-dark": "linear-gradient(135deg, #147067 0%, #124F4A 100%)",
        // Girih tile: two overlapping squares (one rotated 45°) forming an
        // eight-pointed star outline. This is the ONLY place a raw hex is
        // allowed in the design system (accent #F5A623 at 6% opacity).
        "girih-sidebar":
          "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='40'%20height='40'%20viewBox='0%200%2040%2040'%3E%3Cg%20fill='none'%20stroke='%23F5A623'%20stroke-width='1'%20opacity='0.06'%3E%3Crect%20x='8'%20y='8'%20width='24'%20height='24'/%3E%3Crect%20x='8'%20y='8'%20width='24'%20height='24'%20transform='rotate(45%2020%2020)'/%3E%3C/g%3E%3C/svg%3E\")",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        // Heritage serif for display type (screen titles, big numbers, brand).
        // Pairing a serif display with the sans UI is what carries the
        // "milliy + zamonaviy" idea. System stack — no webfont to load, and
        // every face here covers Latin + Cyrillic (uz/ru).
        display: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
          "Book Antiqua",
          "Georgia",
          "serif",
        ],
      },
      boxShadow: {
        // Card depth + a top light edge, both theme-aware via CSS variables
        // (defined in index.css). Every `shadow-card` element gains soft
        // elevation in light and a lifted, glossy edge in dark.
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        // Soft gilt glow under an active gold element (bottom-tab pill, FAB).
        "glow-accent": "0 8px 22px -8px rgba(242, 169, 60, 0.6)",
        // Coloured glows for active status chips — a lit, tappable feel.
        "glow-success": "0 8px 18px -8px rgba(16, 185, 129, 0.6)",
        "glow-warning": "0 8px 18px -8px rgba(245, 166, 35, 0.55)",
        "glow-danger": "0 8px 18px -8px rgba(220, 80, 80, 0.55)",
      },
    },
  },
  plugins: [],
};
