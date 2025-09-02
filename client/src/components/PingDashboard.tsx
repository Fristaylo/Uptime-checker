import { useState, useEffect } from "react";
import styles from "./PingDashboard.module.scss";
import CountryChart from "./CountryChart";
import HttpDashboard from "./HttpDashboard";
import ReactCountryFlag from "react-country-flag";

interface Log {
  rtt_avg?: number;
  created_at: string;
  packet_loss?: number;
  ttfb?: number;
  status_code?: number;
}

interface CityLogs {
  [city: string]: Log[];
}

interface CountryLogs {
  [country: string]: CityLogs;
}

const countryNames: Record<string, string> = {
  RU: "Россия",
  UA: "Украина",
  LV: "Латвия",
  LT: "Литва",
  EE: "Эстония",
  KZ: "Казахстан",
};
const countryOrder = ["RU", "UA", "KZ", "LV", "LT", "EE"];

const PingDashboard = () => {
  const [pingLogs, setPingLogs] = useState<CountryLogs>({});
  const [httpLogs, setHttpLogs] = useState<CountryLogs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [view, setView] = useState("ping");

  const fetchLogs = async () => {
    try {
      const [pingResponse, httpResponse] = await Promise.all([
        fetch("/logs"),
        fetch("/http-logs"),
      ]);

      if (!pingResponse.ok) {
        throw new Error(`HTTP error! status: ${pingResponse.status}`);
      }
      if (!httpResponse.ok) {
        throw new Error(`HTTP error! status: ${httpResponse.status}`);
      }

      const pingData: CountryLogs = await pingResponse.json();
      const httpData: CountryLogs = await httpResponse.json();

      setPingLogs(pingData);
      setHttpLogs(httpData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.pingDashboard}>
      <div className={styles.header}>
        <h2>Статус yummyani.me</h2>
        <div className={styles.controls}>
          <button onClick={() => setView("ping")}>Ping</button>
          <button onClick={() => setView("http")}>HTTP</button>
          <label htmlFor="limit-select">Точек на графике:</label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      {view === "ping" ? (
        <div className={styles.chartsGrid}>
          {Object.entries(pingLogs)
            .sort(
              ([a], [b]) => countryOrder.indexOf(a) - countryOrder.indexOf(b)
            )
            .map(([countryCode, cityLogs]) => {
              const countryName = countryNames[countryCode] || countryCode;
              return (
                <div key={countryCode} className={styles.countryChart}>
                  <div className={styles.countryHeader}>
                    <ReactCountryFlag
                      countryCode={countryCode}
                      svg
                      style={{
                        width: "24px",
                        height: "16px",
                        borderRadius: "5px",
                      }}
                      title={countryName}
                    />
                    <p className={styles.countryName}>{countryName}</p>
                  </div>
                  <div className={styles.chartContainer}>
                    <CountryChart
                      cityLogs={cityLogs}
                      limit={limit}
                      dataType="ping"
                    />
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <HttpDashboard logs={httpLogs} limit={limit} />
      )}
    </div>
  );
};

export default PingDashboard;