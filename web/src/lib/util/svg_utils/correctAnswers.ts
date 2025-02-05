// 0: nw, 1: ni, 2: hb, 3: hh, 4:sh, 5: mv, 6: bb

export const correctAnswers: { [key: number]: { [key: number]: string[] } } = {
	0: {
		0: ['nordrhein-westfalen', 'nordrhein westfalen', 'nordrheinwestfalen', 'nrw'],
		1: ['niedersachsen', 'niedersachsen', 'niedersachsen', 'ni'],
		2: ['hamburg', 'hamburg', 'hamburg', 'hh'],
		3: ['hessen', 'hessen', 'hessen', 'he'],
		4: ['schleswig-holstein', 'schleswig holstein', 'schleswigholstein', 'sh'],
		5: ['mecklenburg-vorpommern', 'mecklenburg vorpommern', 'mecklenburgvorpommern', 'mv'],
		6: ['brandenburg', 'brandenburg', 'brandenburg', 'bb']
	}
};
