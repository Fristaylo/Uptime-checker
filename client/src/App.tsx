import { Routes, Route } from "react-router-dom";
import Footer from "./components/Footer";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";

function App() {
    return (
        <>
            <Header />
            <div className="app-container">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/:domain" element={<Dashboard />} />
                </Routes>
            </div>
            <Footer />
        </>
    );
}

export default App;
