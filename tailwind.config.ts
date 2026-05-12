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
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				energy: {
					DEFAULT: 'hsl(var(--energy))',
					foreground: 'hsl(var(--energy-foreground))'
				},
				premium: {
					DEFAULT: 'hsl(var(--premium))',
					foreground: 'hsl(var(--premium-foreground))'
				},
				social: {
					DEFAULT: 'hsl(var(--social))',
					foreground: 'hsl(var(--social-foreground))'
				},
				available: {
					DEFAULT: 'hsl(var(--available))',
					foreground: 'hsl(var(--available-foreground))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-success': 'var(--gradient-success)',
				'gradient-warm': 'var(--gradient-warm)',
				'gradient-premium': 'var(--gradient-premium)',
				'gradient-social': 'var(--gradient-social)',
				'gradient-energy': 'var(--gradient-energy)',
				'gradient-text': 'var(--gradient-primary)'
			},
			boxShadow: {
				'primary': 'var(--shadow-primary)',
				'secondary': 'var(--shadow-secondary)',
				'card': 'var(--shadow-card)',
				'glow': 'var(--shadow-glow)'
			},
			transitionTimingFunction: {
				'smooth': 'var(--transition-smooth)',
				'spring': 'var(--transition-spring)',
				'bounce': 'var(--transition-bounce)'
			},
			fontFamily: {
				'outfit': ['Outfit', 'sans-serif'],
				'space': ['Space Grotesk', 'sans-serif'],
				'mono': ['JetBrains Mono', 'monospace'],
				'sans': ['Outfit', 'Inter', 'sans-serif'],
			},
			fontWeight: {
				'light': '300',
				'normal': '400',
				'medium': '500',
				'semibold': '600',
				'bold': '700',
				'extrabold': '800',
			},
			fontSize: {
				'2xs': ['0.6rem', { lineHeight: '0.8rem' }],
				'xs': ['0.65rem', { lineHeight: '0.9rem' }],
				'sm': ['0.8rem', { lineHeight: '1.1rem' }],
				'base': ['0.9rem', { lineHeight: '1.35rem' }],
				'lg': ['1rem', { lineHeight: '1.5rem' }],
				'xl': ['1.15rem', { lineHeight: '1.6rem' }],
				'2xl': ['1.35rem', { lineHeight: '1.8rem' }],
				'3xl': ['1.7rem', { lineHeight: '2.1rem' }],
				'4xl': ['2rem', { lineHeight: '2.4rem' }],
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
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
