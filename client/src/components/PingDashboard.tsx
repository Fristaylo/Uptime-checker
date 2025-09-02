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
  "RU-MOW": "Россия - Москва",
  UA: "Украина",
  "UA-IEV": "Украина - Киев",
  LV: "Латвия",
  LT: "Литва",
  EE: "Эстония",
  KZ: "Казахстан",
};

const PingDashboard = () => {
  const [logsByCountry, setLogsByCountry] = useState<Record<string, PingLog[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/logs");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Record<string, PingLog[]> = await response.json();
      setLogsByCountry(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch logs immediately on component mount
    fetchLogs();

    // Then set up the interval to fetch logs every 2 minutes
    const interval = setInterval(fetchLogs, 120000); // 2 minutes
    console.log(
      `[${new Date().toLocaleTimeString()}] Interval set for 2 minutes.`
    );

    return () => {
      clearInterval(interval);
      console.log(`[${new Date().toLocaleTimeString()}] Interval cleared.`);
    };
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const cityLogs: Record<string, PingLog[]> = {};
  const countryLogs: Record<string, PingLog[]> = {};

  Object.entries(logsByCountry).forEach(([key, logs]) => {
    if (key.includes("-")) {
      cityLogs[key] = logs;
    } else {
      countryLogs[key] = logs;
    }
  });

  return (
    <div className={styles.pingDashboard}>
      <h2>Статус yummyani.me</h2>
      {Object.entries(countryLogs).map(([countryCode, logs]) => {
        const recentLogs = logs.slice(-20);
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
              <CountryChart country={countryName} logs={recentLogs} />
            </div>
          </div>
        );
      })}
      {Object.entries(cityLogs).map(([cityCode, logs]) => {
        const recentLogs = logs.slice(-20);
        const cityName = countryNames[cityCode] || cityCode;
        const countryCode = cityCode.split("-");
        return (
          <div key={cityCode} className={styles.countryChart}>
            <div className={styles.countryHeader}>
              <ReactCountryFlag
                countryCode={countryCode[0]}
                svg
                style={{
                  width: "24px",
                  height: "16px",
                  borderRadius: "5px",
                }}
                title={cityName}
              />
              <p className={styles.countryName}>{cityName}</p>
            </div>
            <div className={styles.chartContainer}>
              <CountryChart
                country={cityName}
                logs={recentLogs}
                lineColor="#82ca9d"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PingDashboard;
