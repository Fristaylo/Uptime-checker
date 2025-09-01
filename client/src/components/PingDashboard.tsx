import { useState, useEffect } from 'react';
import styles from './PingDashboard.module.scss';

interface PingLog {
  id: number;
  probe_id: string;
  country: string;
  city: string;
  asn: number;
  network: string;
  packets_sent: number;
  packets_received: number;
  packet_loss: number;
  rtt_min: number;
  rtt_max: number;
  rtt_avg: number;
  rtt_mdev: number;
  created_at: string;
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
      const data: PingLog[] = await response.json();
      
      const groupedLogs = data.reduce((acc, log) => {
        const country = log.country;
        if (!acc[country]) {
          acc[country] = [];
        }
        acc[country].push(log);
        return acc;
      }, {} as Record<string, PingLog[]>);

      setLogsByCountry(groupedLogs);
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
    const interval = setInterval(triggerPing, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (packetLoss: number) => {
    if (packetLoss === 0) return styles.green;
    if (packetLoss > 0 && packetLoss < 100) return styles.yellow;
    return styles.red;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.pingDashboard}>
      <h2>Статус yummyani.me</h2>
      {Object.entries(logsByCountry).map(([country, logs]) => (
        <div key={country} className={styles.countryRow}>
          <span className={styles.countryName}>{country}</span>
          <div className={styles.pingSquares}>
            {logs.slice(0, 50).reverse().map((log) => (
              <div
                key={log.id}
                className={`${styles.pingSquare} ${getStatusColor(log.packet_loss)}`}
                title={`City: ${log.city}\nNetwork: ${log.network}\nPacket Loss: ${log.packet_loss}%\nAvg RTT: ${log.rtt_avg}ms`}
              ></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PingDashboard;