import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  const [timeRange, setTimeRange] = useState("hour");
  const location = useLocation();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [pingResponse, httpResponse] = await Promise.all([
        fetch(`/logs?timeRange=${timeRange}`),
        fetch(`/http-logs?timeRange=${timeRange}`),
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
  }, [timeRange]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.pingDashboard}>
      <div className={styles.header}>
        <h2>Статус yummyani.me</h2>
        <div className={styles.controls}>
          <NavLink to="/ping" className={({ isActive }) => isActive ? styles.active : ''}>Ping</NavLink>
          <NavLink to="/http" className={({ isActive }) => isActive ? styles.active : ''}>HTTP</NavLink>
          <label htmlFor="timeRange-select">Выбор времени:</label>
          <select
            id="timeRange-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="day">День</option>
            <option value="4hours">4 часа</option>
            <option value="hour">Час</option>
            <option value="30minutes">30 минут</option>
          </select>
        </div>
      </div>
      {location.pathname === "/ping" ? (
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
                      timeRange={timeRange}
                      dataType="ping"
                    />
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <HttpDashboard logs={httpLogs} timeRange={timeRange} />
      )}
    </div>
  );
};

export default PingDashboard;