import CountryChart from "./CountryChart";
import styles from "./PingDashboard.module.scss";
import ReactCountryFlag from "react-country-flag";

interface Log {
  total_time?: number;
  created_at: string;
  status_code?: number;
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

interface HttpDashboardProps {
  logs: CountryLogs;
  timeRange: string;
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

const HttpDashboard = ({ logs, timeRange }: HttpDashboardProps) => {
  return (
    <div className={styles.chartsGrid}>
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
                <CountryChart
                  cityLogs={cityLogs}
                  timeRange={timeRange}
                  dataType="http"
                />
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default HttpDashboard;