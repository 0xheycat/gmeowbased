import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
    darkMode: ['selector', '[data-theme="dark"]'],
    content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		fontSize: {
  			'2xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px / 14px leading
  			'11': ['0.6875rem', { lineHeight: '1rem' }],       // 11px / 16px leading
  		},
  		letterSpacing: {
  			'pill': '0.18em',         // .guild-pill, .pixel-pill
  			'label': '0.22em',        // uppercase labels
  			'section': '0.12em',      // .pixel-section-title
  			'button': '0.08em',       // buttons, CTAs
  			'subtle': '0.04em',       // body text emphasis
  			'tight-custom': '-0.02em', // tight headings
  		},
  		colors: {
  			// Gmeowbased Brand Colors (from Tailwick v2.0 theme)
  			'farcaster-purple': 'var(--color-primary, #8B5CF6)',
  			'base-blue': 'var(--color-secondary, #0052FF)',
  			
  			// Tailwick v2.0 Color Scale (default: zinc)
  			default: {
  				50: 'var(--color-default-50)',
  				100: 'var(--color-default-100)',
  				200: 'var(--color-default-200)',
  				300: 'var(--color-default-300)',
  				400: 'var(--color-default-400)',
  				500: 'var(--color-default-500)',
  				600: 'var(--color-default-600)',
  				700: 'var(--color-default-700)',
  				800: 'var(--color-default-800)',
  				900: 'var(--color-default-900)',
  				950: 'var(--color-default-950)',
  			},
  			
  			// Legacy Gmeowbased colors (keep for compatibility)
  			gold: {
  				DEFAULT: '#ffd700',
  				dark: '#d4af37',
  			},
			'accent-green': {
				DEFAULT: '#7CFF7A',
				dark: '#5FE55D',
			},
  			'dark-bg': {
  				DEFAULT: '#06091a',
  				'hover': '#0b0f2a',
  				'card': '#08122e',
  				'panel': '#081223',
  				'surface': '#0a1529',
  				'elevated': '#091324',
  				'alt': '#070f25',
  				'secondary': '#07122d',
  				'tertiary': '#060b1d',
  				'quaternary': '#0b132d',
  				'neutral': '#1a1410',
  			},
  			
  			// Tailwind/shadcn colors (from CSS variables)
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			success: 'var(--color-success, #10B981)',
  			danger: 'var(--color-danger, #EF4444)',
  			warning: 'var(--color-warning, #F59E0B)',
  			info: 'var(--color-info, #3B82F6)',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)'
		},
		keyframes: {
			blink: {
				'0%': { opacity: '0.2' },
				'20%': { opacity: '1' },
				'100%': { opacity: '0.2' }
			},
			expand: {
				'0%': { opacity: '0', transform: 'scale(1)' },
				'30%': { opacity: '1' },
				'80%': { opacity: '0.5' },
				'100%': { opacity: '0', transform: 'scale(30)' }
			},
			'expand-large': {
				'0%': { opacity: '0', transform: 'scale(1)' },
				'30%': { opacity: '1' },
				'80%': { opacity: '0.5' },
				'100%': { opacity: '0', transform: 'scale(96)' }
			},
			moveUp: {
				'0%': { transform: 'translateY(0)' },
				'100%': { transform: 'translateY(-20px)' }
			},
			moveUpSmall: {
				'0%': { transform: 'translateY(0)' },
				'100%': { transform: 'translateY(-10px)' }
			},
			scaleUp: {
				'0%': { transform: 'scale(0)' },
				'100%': { transform: 'scale(1)' }
			}
		},
		animation: {
			blink: 'blink 1.4s infinite both',
			'move-up': 'moveUp 0.5s infinite alternate',
			'move-up-small': 'moveUpSmall 0.5s infinite alternate',
			'scale-up': 'scaleUp 0.5s infinite alternate',
			'drip-expand': 'expand 0.5s ease-in forwards',
			'drip-expand-large': 'expand-large 0.6s ease-in forwards'
		}
  	}
  },
	plugins: [tailwindcssAnimate],
}
export default config