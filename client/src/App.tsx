import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard/:domain" element={<Navigate to="http" />} />
        <Route path="/dashboard/:domain/http" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
