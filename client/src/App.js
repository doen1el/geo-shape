import React from "react";
import { Routes, Route } from "react-router-dom";
import Start from "./components/Start";
import Game from "./components/Game";

function App() {
	return (
		<div>
			<Routes>
				<Route path="/" element={<Start />} />
				<Route path="/play" element={<Game />} />
				<Route path="*" element={<div>404 Not Found!</div>} />
			</Routes>
		</div>
	);
}

export default App;
