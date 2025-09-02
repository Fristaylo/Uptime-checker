import { useState, useEffect } from 'react';
import styles from './PingDashboard.module.scss';
import CountryChart from './CountryChart';

interface PingLog {
  rtt_avg: number;
  created_at: string;
  packet_loss: number;
}

const PingDashboard = () => {
  const [logsByCountry, setLogsByCountry] = useState<Record<string, PingLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/logs');
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

    // Then set up an interval to fetch logs every minute
    const interval = setInterval(fetchLogs, 60000); // 1 minute

    // Clean up the interval when the component unmounts
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.pingDashboard}>
      <h2>Статус yummyani.me</h2>
      {Object.entries(logsByCountry).map(([country, logs]) => (
        <div key={country} className={styles.countryChart}>
          <CountryChart country={country} logs={logs} />
        </div>
      ))}
    </div>
  );
};

export default PingDashboard;