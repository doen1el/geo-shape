import { tv, type VariantProps } from 'tailwind-variants';

export const buttonVariants = tv({
	base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-base border-2 border-border font-bold ring-offset-bg transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
	variants: {
		variant: {
			default: 'bg-main text-ink shadow-shadow',
			secondary: 'bg-secondary text-ink shadow-shadow',
			danger: 'bg-danger text-ink shadow-shadow',
			neutral: 'bg-surface text-ink shadow-shadow',
			ghost: 'border-transparent shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-black/5'
		},
		size: {
			sm: 'h-9 px-3 text-sm',
			default: 'h-11 px-5 text-base',
			lg: 'h-14 px-8 text-lg',
			icon: 'h-11 w-11'
		}
	},
	defaultVariants: {
		variant: 'default',
		size: 'default'
	}
});

export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
