import { useState, useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";
import styles from "./Dashboard.module.scss";
import CountryChart from "./CountryChart";
import CountryChartPlug from "./CountryChartPlug";
import ReactCountryFlag from "react-country-flag";
import { countries, domains } from "../data/constants";

interface Log {
  created_at: string;
  domain?: string;
  country?: string;
  city?: string;
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
  const [domainLogs, setDomainLogs] = useState<{ [domain: string]: CityLogs }>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [isChartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("hour");
  const [aggregationType, setAggregationType] = useState("standard");
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
        const data: Log[] = await response.json();

        const groupedByDomain = data.reduce((acc, log) => {
          if (log.domain && log.city) {
            const domain = log.domain;
            const city = log.city;
            if (!acc[domain]) {
              acc[domain] = {};
            }
            if (!acc[domain][city]) {
              acc[domain][city] = [];
            }
            acc[domain][city].push(log);
          }
          return acc;
        }, {} as { [domain: string]: CityLogs });
        setDomainLogs(groupedByDomain);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [domain]);

  useEffect(() => {
    setChartLoading(true);
    fetchData().finally(() => setChartLoading(false));
  }, [timeRange]);

  useEffect(() => {
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [domain, timeRange]);

  if (error) return <div>Error: {error}</div>;

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
              onChange={(e) => {
                const newTimeRange = e.target.value;
                if (newTimeRange === "week" || newTimeRange === "day") {
                  setAggregationType("hour");
                } else {
                  setAggregationType("standard");
                }
                setTimeRange(newTimeRange);
              }}
            >
              <option value="week">7 дней</option>
              <option value="day">День</option>
              <option value="4hours">4 часа</option>
              <option value="hour">Час</option>
              <option value="30minutes">30 минут</option>
            </select>
            <label htmlFor="aggregation-select">Группировка:</label>
            <select
              id="aggregation-select"
              value={aggregationType}
              onChange={(e) => setAggregationType(e.target.value)}
            >
              <option value="standard">Стандарт</option>
              <option value="hour">Час</option>
            </select>
          </div>
        </div>
        <div className={styles.chartsGrid}>
          {loading
            ? Array.from({ length: domains.length }).map((_, index) => (
                <CountryChartPlug key={index} />
              ))
            : Object.entries(domainLogs).map(([domain, cityLogs]) => (
                <NavLink
                  to={`${domain}`}
                  key={domain}
                  className={styles.countryChartLink}
                >
                  <div className={styles.countryChart}>
                    <div className={styles.countryHeader}>
                      <p className={styles.countryName}>{domain}</p>
                    </div>
                    <div className={styles.chartContainer}>
                      <CountryChart
                        cityLogs={cityLogs}
                        cities={Object.keys(cityLogs)}
                        timeRange={timeRange}
                        aggregationType={aggregationType}
                        isChartLoading={isChartLoading}
                      />
                    </div>
                  </div>
                </NavLink>
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
          <label htmlFor="timeRange-select">Выбор времени:</label>
          <select
            id="timeRange-select"
            value={timeRange}
            onChange={(e) => {
              const newTimeRange = e.target.value;
              if (newTimeRange === "week" || newTimeRange === "day") {
                setAggregationType("hour");
              } else {
                setAggregationType("standard");
              }
              setTimeRange(newTimeRange);
            }}
          >
            <option value="week">7 дней</option>
            <option value="day">День</option>
            <option value="4hours">4 часа</option>
            <option value="hour">Час</option>
            <option value="30minutes">30 минут</option>
          </select>
          <label htmlFor="aggregation-select">Группировка:</label>
          <select
            id="aggregation-select"
            value={aggregationType}
            onChange={(e) => setAggregationType(e.target.value)}
          >
            <option value="standard">Стандарт</option>
            <option value="hour">Час</option>
          </select>
        </div>
      </div>
      {Object.entries(locationGroups).map(([interval, locations]) => (
        <div key={interval}>
          <h3>{interval.replace("min", " min")} locations</h3>
          <div className={styles.chartsGrid}>
            {loading
              ? countries.map((_, index) => <CountryChartPlug key={index} />)
              : locations
                  .reduce((acc, { country, city }) => {
                    let countryGroup = acc.find(
                      (g) => g.countryCode === country
                    );
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
                    const country = countries.find(
                      (c) => c.code === countryCode
                    );
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
                            aggregationType={aggregationType}
                            isChartLoading={isChartLoading}
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
