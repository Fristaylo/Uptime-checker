import { Routes, Route, Navigate } from "react-router-dom";
import PingDashboard from "./components/PingDashboard";
import HttpDashboard from "./components/HttpDashboard";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Navigate to="/http" />} />
        <Route path="/ping" element={<PingDashboard />} />
        <Route path="/http" element={<PingDashboard />} />
      </Routes>
    </div>
  );
}

export default App;
