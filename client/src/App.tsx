import { Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/:domain" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
