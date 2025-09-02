import { useState, useEffect } from "react";
import styles from "./PingDashboard.module.scss";
import CountryChart from "./CountryChart";
import ReactCountryFlag from "react-country-flag";

interface PingLog {
  rtt_avg: number;
  created_at: string;
  packet_loss: number;
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

interface CityPingLogs {
  [city: string]: PingLog[];
}

interface CountryPingLogs {
  [country: string]: CityPingLogs;
}

const PingDashboard = () => {
  const [logs, setLogs] = useState<CountryPingLogs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/logs");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: CountryPingLogs = await response.json();
      setLogs(data);
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
      {Object.entries(logs)
        .sort(([a], [b]) => countryOrder.indexOf(a) - countryOrder.indexOf(b))
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
              <CountryChart cityLogs={cityLogs} limit={limit} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PingDashboard;
