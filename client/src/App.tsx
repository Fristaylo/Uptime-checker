import { Routes, Route } from "react-router-dom";
import Footer from "./components/Footer";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";
import StaleDataWarning from "./components/StaleDataWarning";
import { useDataStatus } from "./context/DataStatusContext";

function App() {
    const { isAnyError, isAnyStale } = useDataStatus();

    return (
        <>
            <Header />
            <div className="app-container">
                {(isAnyStale || isAnyError) && (
                    <StaleDataWarning isError={isAnyError} />
                )}
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