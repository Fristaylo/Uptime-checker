import { useState, useEffect } from "react";
import { domains } from "../data/constants";
import DomainStatus from "./DomainStatus";
import StatusPlug from "./StatusPlug";
import styles from "./Status.module.scss";

interface Log {
  created_at: string;
  domain?: string;
  country?: string;
  city?: string;
  status_code?: number;
  total_time?: number;
}

interface GroupedLog {
  created_at: string;
  total_time_avg: number;
  results: {
    city: string;
    country: string;
    status_code: number | null;
    total_time: number | null;
  }[];
}

interface DomainLogs {
  [domain: string]: GroupedLog[];
}

interface StatusProps {
  timeRange: string;
  domain?: string;
}

const Status: React.FC<StatusProps> = ({ timeRange, domain }) => {
  const [domainLogs, setDomainLogs] = useState<DomainLogs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const url = domain
        ? `/http-logs?domain=${domain}&timeRange=${timeRange}`
        : `/http-logs?timeRange=${timeRange}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      let logsArray: Log[] = [];
      if (domain) {
        logsArray = Object.entries(data).flatMap(([country, countryData]: [string, any]) =>
          Object.entries(countryData).flatMap(([city, cityData]: [string, any]) =>
            cityData.map((log: Log) => ({ ...log, country, city }))
          )
        );
      } else {
        logsArray = Array.isArray(data) ? data : Object.values(data).flatMap((domainLogs: any) => Object.values(domainLogs).flat());
      }

      const groupedByDomain = logsArray.reduce((acc, log) => {
        const currentDomain = domain || log.domain || "unknown"; 
        if (!acc[currentDomain]) {
          acc[currentDomain] = [];
        }
        acc[currentDomain].push(log);
        return acc;
      }, {} as Record<string, Log[]>);

      const processedDomainLogs: DomainLogs = {};

      for (const domainName in groupedByDomain) {
        const logsForDomain = groupedByDomain[domainName];
        const groupedByTime = logsForDomain.reduce((acc, log) => {
          const time = log.created_at.substring(0, 16); 
          if (!acc[time]) {
            acc[time] = [];
          }
          acc[time].push(log);
          return acc;
        }, {} as Record<string, Log[]>);

        processedDomainLogs[domainName] = Object.entries(groupedByTime)
          .map(([_, logs]) => {
            const total_time_avg =
              logs.reduce((sum, log) => sum + (log.total_time || 0), 0) /
              logs.length;
            return {
              created_at: logs[0].created_at,
              total_time_avg,
              results: logs.map(
                ({ city = "Unknown", country = "Unknown", status_code = null, total_time = null }) => ({
                  city: city || "Unknown",
                  country: country || "Unknown",
                  status_code,
                  total_time,
                })
              ),
            };
          })
          .sort((b, a) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      setDomainLogs(processedDomainLogs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [domain, timeRange]);

  if (loading) return <StatusPlug domain={domain} />;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.statusContainer}>
      {domains.map((d) => (
        (!domain || domain === d) && (
          <DomainStatus key={d} domain={d} logs={domainLogs[d] || []} />
        )
      ))}
    </div>
  );
};

export default Status;