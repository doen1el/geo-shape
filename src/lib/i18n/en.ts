export const en = {
	'app.tagline': 'Guess countries & German states from their outline.',

	'common.back': 'Back',
	'common.connecting': 'Connecting…',

	'nav.leaderboard': '🏆 Leaderboard',
	'leaderboard.title': 'Leaderboard',
	'leaderboard.empty': 'No games played yet — be the first!',
	'leaderboard.wins': 'Wins',
	'leaderboard.games': 'Games',
	'leaderboard.score': 'Score',

	'stats.title': 'Your stats',
	'stats.games': 'Games',
	'stats.wins': 'Wins',
	'stats.best': 'Best round',
	'stats.total': 'Total score',

	'identity.title': 'Who are you?',
	'identity.namePlaceholder': 'Your name',
	'identity.shuffleAvatar': '🎲 Change avatar',

	'create.title': 'New game',
	'create.subtitle': 'Create a room and share the code with your friends.',
	'create.button': 'Create room',
	'create.creating': 'Creating…',

	'join.title': 'Join',
	'join.subtitle': 'Got a room code?',
	'join.codePlaceholder': 'CODE',
	'join.go': 'Go',
	'join.checking': 'Checking…',
	'join.found': 'Room found!',
	'join.notFound': 'No room with that code',

	'identity.tapAvatar': 'Tap avatar to restyle',

	'solo.title': 'Practice solo',
	'solo.subtitle': 'Sharpen your skills against the clock — no friends needed.',
	'solo.button': 'Play solo',
	'solo.again': 'Play again',

	'error.connect': 'Could not connect to the server.',

	'lobby.nameTitle': "What's your name?",
	'room.notFound': 'Room “{code}” not found 🤔',
	'room.codeLabel': 'Room code',
	'room.copied': 'Copied!',

	'lobby.players': 'Players',
	'lobby.host': 'HOST',
	'lobby.you': '(you)',
	'lobby.leave': 'Leave',
	'lobby.waitingHost': 'Waiting for the host…',
	'lobby.start': 'Start game',

	'settings.category': 'Category',
	'settings.rounds': 'Rounds',
	'category.0': 'German states',
	'category.1': 'Europe',
	'category.2': 'World',

	'game.round': 'Round {round}/{max}',
	'game.guessPlaceholder': 'Type your guess…',
	'game.send': 'Send',
	'game.correct': 'Correct! 🎉',
	'game.close': 'Close! 🔥',
	'game.solvedBy': '{name} guessed it!',
	'game.alreadySolved': 'You already guessed it — sit tight!',
	'game.theAnswerWas': 'The answer was {answer}',

	'info.capital': 'Capital',
	'info.population': 'Population',
	'info.area': 'Area',
	'info.didYouKnow': 'Did you know?',

	'game.scores': 'Scores',
	'game.waitingNextRound': 'Next round starting…',
	'game.gameOver': 'Game over',
	'game.winner': '{name} wins! 🏆',
	'game.tie': "It's a tie!",
	'game.playAgain': 'Back to lobby'
} as const;

export type MessageKey = keyof typeof en;
