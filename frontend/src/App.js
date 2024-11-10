import Landing from "./pages/Landing/Landing";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GameRoom from "./pages/GameRoom/GameRoom";
function App() {

  return (
    <Router>
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path="/room/:gameID" element={<GameRoom />} />
      </Routes>
    </Router>
  );
}
export default App;
