import { useState, useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";
import styles from "./Dashboard.module.scss"; // Изменено на Dashboard.module.scss
import CountryChart from "./CountryChart";
import ReactCountryFlag from "react-country-flag";
import { countries } from "../data/constants";

interface Log {
  created_at: string;
  status_code?: number;
  total_time?: number;
  download_time?: number;
  first_byte_time?: number;
  dns_time?: number;
  tls_time?: number;
  tcp_time?: number;
}

interface CityLogs {
  [city: string]: Log[];
}

interface CountryLogs {
  [country: string]: CityLogs;
}

const Dashboard = () => {
  const [httpLogs, setHttpLogs] = useState<CountryLogs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("hour");
  const { domain } = useParams<{ domain: string }>();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [httpResponse] = await Promise.all([
        fetch(`/http-logs?timeRange=${timeRange}&domain=${domain}`),
      ]);
      if (!httpResponse.ok) {
        throw new Error(`HTTP error! status: ${httpResponse.status}`);
      }

      const httpData: CountryLogs = await httpResponse.json();
      setHttpLogs(httpData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [timeRange, domain]);

  useEffect(() => {
    const eventSource = new EventSource("/events");

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [timeRange, domain]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const currentLogs = httpLogs;
  const dataType = "http";

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Статус {domain}</h2>
        <div className={styles.controls}>
          <NavLink
            to={`/dashboard/${domain}/http`}
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            HTTP
          </NavLink>
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
      <div className={styles.chartsGrid}>
        {Object.entries(currentLogs)
          .sort(
            ([a], [b]) =>
              countries.findIndex((c) => c.code === a) -
              countries.findIndex((c) => c.code === b)
          )
          .map(([countryCode, cityLogs]) => {
            const country = countries.find((c) => c.code === countryCode);
            const countryName = country ? country.name : countryCode;
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
                    dataType={dataType}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Dashboard;
