
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        premium: {
          DEFAULT: '#6d28d9', // Purple-700
          dark: '#5b21b6',    // Purple-800
          light: '#8b5cf6',   // Purple-500
          extralight: '#c4b5fd', // Purple-300
          foreground: '#ffffff'
        },
        futuristic: {
          blue: '#1EAEDB',
          purple: '#9b87f5',
          black: '#1A1F2C',
          silver: '#9F9EA1'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-out': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(10px)'
          }
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0)'
          },
          '50%': {
            transform: 'translateY(-10px)'
          }
        },
        'glow': {
          '0%, 100%': {
            boxShadow: '0 0 15px 2px rgba(155, 135, 245, 0.3)'
          },
          '50%': {
            boxShadow: '0 0 25px 5px rgba(155, 135, 245, 0.6)'
          }
        },
        'pulse-premium': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.4)'
          },
          '50%': {
            boxShadow: '0 0 0 15px rgba(139, 92, 246, 0)'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'pulse-premium': 'pulse-premium 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium-radial': 'radial-gradient(circle at top right, #9b87f5, #1A1F2C 70%)',
        'gradient-premium': 'linear-gradient(to right, #6d28d9, #9b87f5)',
        'gradient-futuristic': 'linear-gradient(135deg, #1EAEDB 0%, #9b87f5 100%)',
        'gradient-subtle': 'linear-gradient(to right, rgba(155, 135, 245, 0.1), rgba(30, 174, 219, 0.1))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M0 0h100v1H0z' fill='%239F9EA1' fill-opacity='.05'/%3E%3Cpath d='M0 0v100h1V0z' fill='%239F9EA1' fill-opacity='.05'/%3E%3C/svg%3E\")"
      },
      boxShadow: {
        'premium': '0 0 15px 2px rgba(155, 135, 245, 0.3)',
        'premium-hover': '0 0 25px 5px rgba(155, 135, 245, 0.6)',
        'futuristic': '0 10px 30px -10px rgba(30, 174, 219, 0.3)'
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'hsl(var(--foreground))',
            '[class~="lead"]': {
              color: 'hsl(var(--foreground))',
            },
            a: {
              color: 'hsl(var(--primary))',
              textDecoration: 'underline',
              fontWeight: '500',
            },
            strong: {
              color: 'hsl(var(--foreground))',
              fontWeight: '600',
            },
            'ol > li::before': {
              color: 'hsl(var(--foreground))',
              fontWeight: '400',
            },
            'ul > li::before': {
              backgroundColor: 'hsl(var(--foreground) / 0.4)',
            },
            hr: {
              borderColor: 'hsl(var(--muted) / 0.2)',
            },
            blockquote: {
              color: 'hsl(var(--foreground))',
              borderLeftColor: 'hsl(var(--muted) / 0.2)',
            },
            h1: {
              color: 'hsl(var(--foreground))',
            },
            h2: {
              color: 'hsl(var(--foreground))',
            },
            h3: {
              color: 'hsl(var(--foreground))',
            },
            h4: {
              color: 'hsl(var(--foreground))',
            },
            'figure figcaption': {
              color: 'hsl(var(--muted-foreground))',
            },
            code: {
              color: 'hsl(var(--foreground))',
            },
            'a code': {
              color: 'hsl(var(--foreground))',
            },
            pre: {
              color: 'hsl(var(--muted-foreground))',
              backgroundColor: 'hsl(var(--muted) / 0.1)',
            },
            thead: {
              borderBottomColor: 'hsl(var(--muted) / 0.2)',
            },
            'tbody tr': {
              borderBottomColor: 'hsl(var(--muted) / 0.2)',
            },
          },
        },
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
