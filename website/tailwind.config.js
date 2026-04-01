/** @type {import('tailwindcss').Config} */
const { fontFamily: defaultFontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  corePlugins: {
    preflight: false,
    container: false,
  },
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./docs/**/*.{md,mdx,tsx}",
    "./recipes/**/*.{md,mdx,tsx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      maxWidth: {
        "9xl": "90rem", // 1440px
      },
      screens: {
        mobile: "375px",
        tablet: "768px",
        desktop: "1024px",
        "desktop-lg": "1200px",
        hd: "1820px",
        "blog-sm": "975px",
        "blog-md": "1000px",
        "blog-lg": "1280px",
        "blog-max": "1408px",
        "blog-xl": "1440px",
        "blog-2xl": "1584px",
        "landing-content": "944px",
        "landing-lg": "1296px",
        "landing-xs": "360px",
        "landing-sm": "720px",
        "landing-md": "960px",
        "landing-xl": "1440px",
      },
      colors: {
        "primary-yellow": "var(--color-yellow)",
        "primary-black": "var(--color-black)",
        "primary-white": "var(--color-white)",
        "accent-cyan": "var(--color-blue)",
        "accent-purple": "var(--color-purple)",
        "light-yellow": "#3b82f6",
        "main-emerald": "#10b981",
        "main-red": "#ef4444",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      keyframes: {
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.95)",
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        gradient: {
          "0%, 100%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-20px)",
          },
        },
        "gradient-xy": {
          "0%, 100%": {
            "background-size": "400% 400%",
            "background-position": "left top",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right bottom",
          },
        },
        "gradient-slow": {
          "0%": {
            "background-position": "0% 50%",
          },
          "50%": {
            "background-position": "100% 50%",
          },
          "100%": {
            "background-position": "0% 50%",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        marquee: {
          from: {
            transform: "translateX(0)",
          },
          to: {
            transform: "translateX(calc(-100% - var(--gap)))",
          },
        },
        "marquee-vertical": {
          from: {
            transform: "translateY(0)",
          },
          to: {
            transform: "translateY(calc(-100% - var(--gap)))",
          },
        },
        "line-shadow": {
          "0%": { "background-position": "0 0" },
          "100%": { "background-position": "100% -100%" },
        },
        "glow-line": {
          "0%": {
            "background-position": "0% 0%",
          },
          "100%": {
            "background-position": "100% 100%",
          },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        gradient: "gradient 8s linear infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "float-slower": "float 10s ease-in-out infinite",
        "gradient-xy": "gradient-xy 15s ease infinite",
        "gradient-slow": "gradient-slow 3s ease infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        marquee: "marquee var(--duration) infinite linear",
        "line-shadow": "line-shadow 15s linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "glow-line": "glow-line 2s linear infinite",
      },
    },
    fontFamily: {
      sans: ["IBM Plex Mono", "monospace", "var(--font-sans)", ...defaultFontFamily.sans],
      heading: ["IBM Plex Mono", "monospace"],
    },
    boxShadow: {
      "button-sh":
        "2px 2px 0px 0px #000, 4px 4px 0px 0px #000, 6px 6px 0px 0px #000, 8px 8px 0px 0px #000",
      "button-sh-hv": "2px 2px 0px 0px #000, 4px 4px 0px 0px #000",
      "button-sh-yellow":
        "2px 2px 0px 0px var(--color-yellow), 4px 4px 0px 0px var(--color-yellow), 6px 6px 0px 0px var(--color-yellow), 8px 8px 0px 0px var(--color-yellow)",
      "button-sh-hv-yellow":
        "2px 2px 0px 0px var(--color-yellow), 4px 4px 0px 0px var(--color-yellow)",
      "button-sh-cyan":
        "2px 2px 0px 0px var(--color-blue), 4px 4px 0px 0px var(--color-blue), 6px 6px 0px 0px var(--color-blue), 8px 8px 0px 0px var(--color-blue)",
      "button-sh-hv-cyan": "2px 2px 0px 0px var(--color-blue), 4px 4px 0px 0px var(--color-blue)",
      "button-sh-purple":
        "2px 2px 0px 0px var(--color-purple), 4px 4px 0px 0px var(--color-purple), 6px 6px 0px 0px var(--color-purple), 8px 8px 0px 0px var(--color-purple)",
      "button-sh-hv-purple":
        "2px 2px 0px 0px var(--color-purple), 4px 4px 0px 0px var(--color-purple)",
    },
    plugins: ['require("tailwind-component-classes")'],
    components: {
      copy: "text-copy-mobile tablet:text-copy font-copy-mobile tablet:font-copy",
      "copy-sm": "text-copy-sm-mobile tablet:text-copy-sm font-copy-sm-mobile tablet:font-copy-sm",
      "copy-footer":
        "text-copy-footer-mobile tablet:text-copy-footer font-copy-footer-mobile tablet:font-copy-footer",
      "nav-links":
        "text-nav-links-mobile tablet:text-nav-links font-nav-links-mobile tablet:font-nav-links",
      "button-text": "text-button-text font-button-text",
      "breadcrumbs-text": "text-breadcrumbs font-breadcrumbs",
    },
    backgroundImage: {
      "vertical-divider": "url(/img/vertical-divider.svg)",
    },
  },
  plugins: [require("tailwind-component-classes"), require("tailwindcss-animate")],
};
