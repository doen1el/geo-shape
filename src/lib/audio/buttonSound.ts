import type { Action } from 'svelte/action';
import { playButtonClickSound, playButtonHoverSound } from './uiSounds';

export const buttonSound: Action<HTMLElement> = (node) => {
	const onMouseEnter = () => playButtonHoverSound();
	const onClick = () => playButtonClickSound();

	node.addEventListener('mouseenter', onMouseEnter);
	node.addEventListener('click', onClick);

	return {
		destroy() {
			node.removeEventListener('mouseenter', onMouseEnter);
			node.removeEventListener('click', onClick);
		}
	};
};
