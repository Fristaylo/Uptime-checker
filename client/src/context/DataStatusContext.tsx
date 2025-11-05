import {
    createContext,
    useState,
    useContext,
    useCallback,
    type ReactNode,
} from "react";

type Status = "loading" | "success" | "error" | "stale";

interface DataStatusContextType {
    setStatus: (id: string, status: Status) => void;
    isAnyStale: boolean;
    isAnyError: boolean;
}

const DataStatusContext = createContext<DataStatusContextType | undefined>(
    undefined
);

export const DataStatusProvider = ({ children }: { children: ReactNode }) => {
    const [statuses, setStatuses] = useState<Record<string, Status>>({});

    const setStatus = useCallback((id: string, status: Status) => {
        setStatuses((prev) => ({ ...prev, [id]: status }));
    }, []);

    const isAnyStale = Object.values(statuses).some((s) => s === "stale");
    const isAnyError = Object.values(statuses).some((s) => s === "error");

    const value = { setStatus, isAnyStale, isAnyError };

    return (
        <DataStatusContext.Provider value={value}>
            {children}
        </DataStatusContext.Provider>
    );
};

export const useDataStatus = () => {
    const context = useContext(DataStatusContext);
    if (context === undefined) {
        throw new Error("useDataStatus must be used within a DataStatusProvider");
    }
    return context;
};