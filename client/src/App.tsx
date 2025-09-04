import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Navigate to="/http" />} />
        <Route path="/ping" element={<Dashboard />} />
        <Route path="/http" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
