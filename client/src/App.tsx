import { Routes, Route } from "react-router-dom";
import Footer from "./components/Footer/Footer.tsx";
import Dashboard from "./components/Dashboard/Dashboard.tsx";
import Header from "./components/Header/Header.tsx";
import StaleDataWarning from "./components/StaleDataWarning/StaleDataWarning.tsx";
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