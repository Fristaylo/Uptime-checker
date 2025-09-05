import { useState, useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";
import styles from "./Dashboard.module.scss"; // Изменено на Dashboard.module.scss
import CountryChart from "./CountryChart";
import ReactCountryFlag from "react-country-flag";
import { countries } from "../data/constants";

interface Log {
  created_at: string;
  domain?: string;
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

interface Location {
  country: string;
  city: string;
}

interface LocationGroups {
  [interval: string]: Location[];
}

const Dashboard = () => {
  const [httpLogs, setHttpLogs] = useState<CountryLogs>({});
  const [locationGroups, setLocationGroups] = useState<LocationGroups>({});
  const [domainLogs, setDomainLogs] = useState<{ [domain: string]: CityLogs }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("hour");
  const { domain } = useParams<{ domain: string }>();

  const fetchData = async () => {
    try {
      if (domain) {
        const [logsResponse, locationsResponse] = await Promise.all([
          fetch(`/http-logs?timeRange=${timeRange}&domain=${domain}`),
          fetch("/locations"),
        ]);

        if (!logsResponse.ok) {
          throw new Error(`HTTP error! status: ${logsResponse.status}`);
        }
        if (!locationsResponse.ok) {
          throw new Error(`HTTP error! status: ${locationsResponse.status}`);
        }

        const logsData: CountryLogs = await logsResponse.json();
        const locationsData: LocationGroups = await locationsResponse.json();

        setHttpLogs(logsData);
        setLocationGroups(locationsData);
      } else {
        const response = await fetch(`/http-logs?timeRange=${timeRange}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: CityLogs = await response.json();

        const groupedByDomain: { [domain: string]: CityLogs } = {};

        for (const city in data) {
          for (const log of data[city]) {
            if (log.domain) {
              if (!groupedByDomain[log.domain]) {
                groupedByDomain[log.domain] = {};
              }
              if (!groupedByDomain[log.domain][city]) {
                groupedByDomain[log.domain][city] = [];
              }
              groupedByDomain[log.domain][city].push(log);
            }
          }
        }
        setDomainLogs(groupedByDomain);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, domain]);

  useEffect(() => {
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [domain, timeRange]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const dataType = "http";

  if (!domain) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h2>Статусы доменов</h2>
          <div className={styles.controls}>
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
          {Object.entries(domainLogs).map(([domain, cityLogs]) => (
            <div key={domain} className={styles.countryChart}>
              <div className={styles.countryHeader}>
                <p className={styles.countryName}>{domain}</p>
              </div>
              <div className={styles.chartContainer}>
                <CountryChart
                  cityLogs={cityLogs}
                  cities={Object.keys(cityLogs)}
                  timeRange={timeRange}
                  dataType={dataType}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
      {Object.entries(locationGroups).map(([interval, locations]) => (
        <div key={interval}>
          <h3>{interval.replace("min", " min")} locations</h3>
          <div className={styles.chartsGrid}>
            {locations
              .reduce((acc, { country, city }) => {
                let countryGroup = acc.find((g) => g.countryCode === country);
                if (!countryGroup) {
                  countryGroup = { countryCode: country, cities: [] };
                  acc.push(countryGroup);
                }
                countryGroup.cities.push(city);
                return acc;
              }, [] as { countryCode: string; cities: string[] }[])
              .sort(
                (a, b) =>
                  countries.findIndex((c) => c.code === a.countryCode) -
                  countries.findIndex((c) => c.code === b.countryCode)
              )
              .map(({ countryCode, cities }) => {
                const country = countries.find((c) => c.code === countryCode);
                const countryName = country ? country.name : countryCode;
                const cityLogsForCountry = httpLogs[countryCode] || {};

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
                        cityLogs={cityLogsForCountry}
                        cities={cities}
                        timeRange={timeRange}
                        dataType={dataType}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;