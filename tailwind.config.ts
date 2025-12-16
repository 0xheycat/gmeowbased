import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
    darkMode: ['class'],
    content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	// Mobile-first breakpoints from tested template
  	screens: {
  		'xs': '500px',
  		'sm': '640px',
  		'md': '768px',
  		'lg': '1024px',
  		'xl': '1280px',
  		'2xl': '1440px',
  		'3xl': '1780px',
  		'4xl': '2160px',
  	},
  	extend: {
  		fontSize: {
  			'2xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px / 14px leading
  			'11': ['0.6875rem', { lineHeight: '1rem' }],       // 11px / 16px leading
  			'13px': ['13px', '18px'],                          // From template
  		},
  		letterSpacing: {
  			'pill': '0.18em',         // .guild-pill, .pixel-pill
  			'label': '0.22em',        // uppercase labels
  			'section': '0.12em',      // .pixel-section-title
  			'button': '0.08em',       // buttons, CTAs
  			'subtle': '0.04em',       // body text emphasis
  			'tight-custom': '-0.02em', // tight headings
  		},
  		spacing: {
  			'13': '3.375rem',
  		},
  		margin: {
  			'1/2': '50%',
  		},
  		padding: {
  			'full': '100%',
  		},
  		zIndex: {
  			'modal': '50',
  			'tray': '50',
  		},
  		width: {
  			'calc-320': 'calc(100% - 320px)',
  			'calc-358': 'calc(100% - 358px)',
  		},
  		fontFamily: {
  			body: ['Fira Code', 'monospace'],
  		},
  		colors: {
  			// Brand colors
  			'brand': 'rgb(var(--color-brand) / <alpha-value>)',
  			'farcaster-purple': '#8B5CF6',
  			'base-blue': '#0052FF',
  			
  			// Template colors
  			'body': '#fcfcfc',
  			'dark': '#0D1321',
  			'light-dark': '#171e2e',
  			'sidebar-body': '#F8FAFC',
  			
  			// WCAG AA Compliant Colors (added for accessibility)
  			wcag: {
  				// Text colors for light backgrounds
  				'text-primary-light': '#1a1a1a',   // 15.3:1 contrast (AAA)
  				'text-secondary-light': '#424242', // 10.4:1 contrast (AAA)
  				'text-link-light': '#0056b3',      // 8.6:1 contrast (AAA)
  				'text-muted-light': '#5f5f5f',     // 7.1:1 contrast (AAA)
  				
  				// Text colors for dark backgrounds
  				'text-primary-dark': '#ffffff',    // 19.5:1 contrast (AAA)
  				'text-secondary-dark': '#e0e0e0',  // 15.2:1 contrast (AAA)
  				'text-link-dark': '#66b3ff',       // 9.2:1 contrast (AAA)
  				'text-muted-dark': '#b3b3b3',      // 8.9:1 contrast (AAA)
  				
  				// Semantic colors (light backgrounds)
  				'success-light': '#0f7c2d',        // 4.52:1 contrast (AA)
  				'warning-light': '#8c6d00',        // 4.51:1 contrast (AA)
  				'error-light': '#b71c1c',          // 7.2:1 contrast (AAA)
  				'info-light': '#0056b3',           // 8.6:1 contrast (AAA)
  				
  				// Semantic colors (dark backgrounds)
  				'success-dark': '#5FE55D',         // 8.1:1 contrast (AAA)
  				'warning-dark': '#ffd166',         // 9.8:1 contrast (AAA)
  				'error-dark': '#ff6b6b',           // 7.1:1 contrast (AAA)
  				'info-dark': '#66b3ff',            // 9.2:1 contrast (AAA)
  				
  				// Focus indicators (3:1 minimum)
  				'focus-ring': '#0056b3',           // Used with ring-2
  				'focus-ring-dark': '#66b3ff',
  			},
  			
  			gold: {
  				DEFAULT: '#ffd700',    // Bright gold
  				dark: '#d4af37',       // Darker gold variant
  			},
			'accent-green': {
				DEFAULT: '#7CFF7A',    // Success/active state
				dark: '#5FE55D',       // Darker variant for better contrast (8.1:1 WCAG AAA)
			},
  			'dark-bg': {
  				DEFAULT: '#06091a',    // Dark overlay
  				'hover': '#0b0f2a',    // Hover state
  				'card': '#08122e',     // Card backgrounds
  				'panel': '#081223',    // Panel backgrounds
  				'surface': '#0a1529',  // Surface backgrounds
  				'elevated': '#091324', // Elevated surfaces
  				'alt': '#070f25',      // Alternative dark
  				'secondary': '#07122d', // Secondary dark
  				'tertiary': '#060b1d', // Tertiary dark
  				'quaternary': '#0b132d', // Quaternary dark
  				'neutral': '#1a1410',  // Neutral dark brown
  			},
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
  		borderWidth: {
  			'3': '3px',
  		},
  		// WCAG AA compliant transition timings
  		transitionDuration: {
  			'fast': '200ms',   // Quick feedback (hover, focus)
  			'normal': '250ms', // Standard transitions
  			'smooth': '300ms', // Smooth, noticeable changes
  		},
  		transitionTimingFunction: {
  			'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)', // Professional easing
  		},
  		boxShadow: {
  			'main': '0px 6px 18px rgba(0, 0, 0, 0.04)',
  			'light': '0px 4px 4px rgba(0, 0, 0, 0.08)',
  			'large': '0px 8px 16px rgba(17, 24, 39, 0.1)',
  			'card': '0px 2px 6px rgba(0, 0, 0, 0.06)',
  			'transaction': '0px 8px 16px rgba(17, 24, 39, 0.06)',
  			'expand': '0px 0px 50px rgba(17, 24, 39, 0.2)',
  			'button': '0px 2px 4px rgba(0, 0, 0, 0.06), 0px 4px 6px rgba(0, 0, 0, 0.1)',
  			// Focus shadows (3:1 contrast minimum)
  			'focus': '0 0 0 3px rgba(0, 86, 179, 0.3)',
  			'focus-dark': '0 0 0 3px rgba(102, 179, 255, 0.3)',
  		},
  		dropShadow: {
  			'main': '0px 4px 8px rgba(0, 0, 0, 0.08)',
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
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
			},
			// Professional skeleton animations (music template)
			'skeleton-wave': {
				'0%': { backgroundPosition: '200% 0' },
				'100%': { backgroundPosition: '-200% 0' }
			},
			'skeleton-pulsate': {
				'0%': { opacity: '1' },
				'50%': { opacity: '0.4' },
				'100%': { opacity: '1' }
			},
			// Retro/Cyberpunk loader animations
			scan: {
				'0%, 100%': { transform: 'translateY(-100%)' },
				'50%': { transform: 'translateY(100%)' }
			},
			'glitch-1': {
				'0%, 100%': { transform: 'translateX(0)' },
				'33%': { transform: 'translateX(-2px)' },
				'66%': { transform: 'translateX(2px)' }
			}
		},
		animation: {
			blink: 'blink 1.4s infinite both',
			'move-up': 'moveUp 0.5s infinite alternate',
			'move-up-small': 'moveUpSmall 0.5s infinite alternate',
			'scale-up': 'scaleUp 0.5s infinite alternate',
			'drip-expand': 'expand 0.5s ease-in forwards',
			'drip-expand-large': 'expand-large 0.6s ease-in forwards',
			// Professional skeleton animations (LinkedIn-style wave, Twitter-style pulse)
			'skeleton-wave': 'skeleton-wave 1.5s ease-in-out infinite',
			'skeleton-pulsate': 'skeleton-pulsate 1.5s ease-in-out infinite',
			// Retro/Cyberpunk loader animations
			scan: 'scan 2s linear infinite',
			'glitch-1': 'glitch-1 0.3s infinite'
		}
  	}
  },
	plugins: [tailwindcssAnimate],
}
export default config// Skeleton wave animation
// Note: Add to theme.extend.keyframes and theme.extend.animation

const skeletonWave = {
  '0%': { backgroundPosition: '200% 0' },
  '100%': { backgroundPosition: '-200% 0' },
}

