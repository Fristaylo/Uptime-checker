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
  const [logs, setLogs] = useState<PingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const countries = ['RU', 'UA', 'LV', 'LT', 'EE', 'KZ'];

  const fetchLogs = async () => {
    try {
      const response = await fetch('/logs');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLogs(data);
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
      fetchLogs();
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.pingDashboard}>
      <h2>Ping Logs (Last 24 hours)</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Country</th>
            <th>City</th>
            <th>Network</th>
            <th>Packet Loss (%)</th>
            <th>Min RTT (ms)</th>
            <th>Avg RTT (ms)</th>
            <th>Max RTT (ms)</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString()}</td>
              <td>{log.country}</td>
              <td>{log.city}</td>
              <td>{log.network}</td>
              <td>{log.packet_loss}</td>
              <td>{log.rtt_min}</td>
              <td>{log.rtt_avg}</td>
              <td>{log.rtt_max}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PingDashboard;