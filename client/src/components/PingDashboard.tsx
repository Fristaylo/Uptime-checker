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
    console.log(`[${new Date().toLocaleTimeString()}] Triggering ping...`);
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
      console.log(`[${new Date().toLocaleTimeString()}] Ping request successful.`);
    } catch (e: any) {
      setError(e.message);
      console.error(`[${new Date().toLocaleTimeString()}] Error in triggerPing:`, e);
    }
  };

  useEffect(() => {
    const runCycle = async () => {
      await triggerPing();
      // Wait for measurement to be processed before fetching
      await new Promise(resolve => setTimeout(resolve, 7000));
      await fetchLogs();
    };

    // Run once immediately on component mount
    runCycle();

    // Then set up the interval for subsequent runs
    const interval = setInterval(runCycle, 120000); // 2 minutes
    console.log(`[${new Date().toLocaleTimeString()}] Interval set for 2 minutes.`);

    return () => {
      clearInterval(interval);
      console.log(`[${new Date().toLocaleTimeString()}] Interval cleared.`);
    };
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