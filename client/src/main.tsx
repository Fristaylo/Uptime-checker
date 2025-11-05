import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./main.scss";
import App from "./App.tsx";
import { DataStatusProvider } from "./context/DataStatusContext.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <DataStatusProvider>
                <App />
            </DataStatusProvider>
        </BrowserRouter>
    </StrictMode>
);