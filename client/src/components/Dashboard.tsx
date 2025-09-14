import { useState, useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";
import styles from "./Dashboard.module.scss";
import CountryChart from "./CountryChart";
import CountryChartPlug from "./CountryChartPlug";
import ReactCountryFlag from "react-country-flag";
import { countries, domains } from "../data/constants";
import ButtonGroup from "./ButtonGroup";

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
  const allowedCountries = ["RU", "UA", "KZ", "BY"];
  const [httpLogs, setHttpLogs] = useState<CountryLogs>({});
  const [locationGroups, setLocationGroups] = useState<LocationGroups>({});
  const [domainLogs, setDomainLogs] = useState<{ [domain: string]: CityLogs }>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [isChartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(
    () => localStorage.getItem("timeRange") || "week"
  );
  const [aggregationType, setAggregationType] = useState(
    () => localStorage.getItem("aggregationType") || "hour"
  );
  const { domain } = useParams<{ domain: string }>();

  const timeRangeOptions = [
    { value: "week", label: "Неделя" },
    { value: "day", label: "День" },
    { value: "hour", label: "Час" },
  ];

  const aggregationTypeOptions = [
    { value: "standard", label: "По стандарту" },
    { value: "hour", label: "По часам" },
  ];

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
        const filteredData = data.filter(
          (log) => log.country && allowedCountries.includes(log.country)
        );

        const groupedByDomain = filteredData.reduce((acc, log) => {
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
  useEffect(() => {
    if (timeRange === "week") {
      setAggregationType("hour");
    } else {
      setAggregationType("standard");
    }
  }, [timeRange]);

  useEffect(() => {
    localStorage.setItem("timeRange", timeRange);
    localStorage.setItem("aggregationType", aggregationType);
  }, [timeRange, aggregationType]);

  if (error) return <div>Error: {error}</div>;

  if (!domain) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h2>Статусы доменов</h2>
          <div className={styles.controls}>
            <ButtonGroup
              options={timeRangeOptions}
              value={timeRange}
              onChange={setTimeRange}
            />
            <ButtonGroup
              options={aggregationTypeOptions}
              value={aggregationType}
              onChange={setAggregationType}
            />
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
          <ButtonGroup
            options={timeRangeOptions}
            value={timeRange}
            onChange={setTimeRange}
          />
          <ButtonGroup
            options={aggregationTypeOptions}
            value={aggregationType}
            onChange={setAggregationType}
          />
        </div>
      </div>
      {Object.entries(locationGroups).map(([interval, locations]) => (
        <div key={interval}>
          <h3>Локации проверяются раз в {interval.replace("min", " мин.")}</h3>
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
