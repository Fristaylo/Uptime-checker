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

  const countries = ['RU', 'UA', 'LV', 'LT', 'EE', 'KZ'];

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

  const triggerPing = async () => {
    try {
      const response = await fetch('/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target: 'site.yummyani.me', countries }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Ping was successful, now refresh the logs
      setTimeout(fetchLogs, 5000); // Wait 5 seconds for logs to update
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchLogs();
    triggerPing();
    const interval = setInterval(triggerPing, 120000); // 2 minutes

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