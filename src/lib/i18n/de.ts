import type { MessageKey } from './en';

export const de: Partial<Record<MessageKey, string>> = {
	'app.tagline': 'Errate Länder & Bundesländer an ihrer Umrandung.',

	'common.back': 'Zurück',
	'common.connecting': 'Verbinde…',

	'nav.leaderboard': '🏆 Bestenliste',
	'leaderboard.title': 'Bestenliste',
	'leaderboard.empty': 'Noch keine Spiele gespielt — sei die/der Erste!',
	'leaderboard.wins': 'Siege',
	'leaderboard.games': 'Spiele',
	'leaderboard.score': 'Punkte',

	'stats.title': 'Deine Statistik',
	'stats.games': 'Spiele',
	'stats.wins': 'Siege',
	'stats.best': 'Beste Runde',
	'stats.total': 'Gesamtpunkte',

	'identity.title': 'Wer bist du?',
	'identity.namePlaceholder': 'Dein Name',
	'identity.shuffleAvatar': '🎲 Avatar wechseln',

	'create.title': 'Neues Spiel',
	'create.subtitle': 'Erstelle einen Raum und teile den Code mit deinen Freunden.',
	'create.button': 'Raum erstellen',
	'create.creating': 'Erstelle…',

	'join.title': 'Beitreten',
	'join.subtitle': 'Hast du einen Raum-Code?',
	'join.codePlaceholder': 'CODE',
	'join.go': 'Los',

	'solo.title': 'Solo üben',
	'solo.subtitle': 'Trainiere gegen die Uhr — ganz ohne Mitspieler.',
	'solo.button': 'Solo spielen',
	'solo.again': 'Nochmal',

	'error.connect': 'Verbindung zum Server fehlgeschlagen.',

	'lobby.nameTitle': 'Wie heißt du?',
	'room.notFound': 'Raum „{code}“ nicht gefunden 🤔',
	'room.codeLabel': 'Raum-Code',
	'room.copied': 'Kopiert!',

	'lobby.players': 'Spieler',
	'lobby.host': 'HOST',
	'lobby.you': '(du)',
	'lobby.leave': 'Verlassen',
	'lobby.waitingHost': 'Warte auf den Host…',
	'lobby.start': 'Spiel starten',

	'settings.category': 'Kategorie',
	'settings.rounds': 'Runden',
	'category.0': 'Bundesländer',
	'category.1': 'Europa',
	'category.2': 'Welt',

	'game.round': 'Runde {round}/{max}',
	'game.guessPlaceholder': 'Tippe deine Antwort…',
	'game.send': 'Senden',
	'game.correct': 'Richtig! 🎉',
	'game.close': 'Nah dran! 🔥',
	'game.solvedBy': '{name} hat es erraten!',
	'game.alreadySolved': 'Du hast es schon — warte kurz!',
	'game.theAnswerWas': 'Die Antwort war {answer}',

	'info.capital': 'Hauptstadt',
	'info.population': 'Einwohner',
	'info.area': 'Fläche',
	'info.didYouKnow': 'Schon gewusst?',

	'game.scores': 'Punkte',
	'game.waitingNextRound': 'Nächste Runde startet…',
	'game.gameOver': 'Spiel vorbei',
	'game.winner': '{name} gewinnt! 🏆',
	'game.tie': 'Unentschieden!',
	'game.playAgain': 'Zurück zur Lobby'
};
