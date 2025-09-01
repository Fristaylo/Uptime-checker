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

  const fetchAndSavePings = async () => {
    try {
      const response = await fetch('https://api.globalping.io/v1/measurements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GLOBALPING_API_KEY}`,
        },
        body: JSON.stringify({
          "locations": ["RU", "UA", "LV", "LT", "EE", "KZ"],
          "limit": 6,
          "type": "ping",
          "target": "site.yummyani.me",
          "measurementOptions": {
            "packets": 3
          }
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      for (const result of data.results) {
        const log = {
          probeId: result.probe.id,
          country: result.probe.location.country,
          city: result.probe.location.city,
          asn: result.probe.location.asn,
          network: result.probe.location.network,
          packetsSent: result.stats.sent,
          packetsReceived: result.stats.received,
          packetLoss: result.stats.loss,
          rttMin: result.stats.rtt.min,
          rttMax: result.stats.rtt.max,
          rttAvg: result.stats.rtt.avg,
          rttMdev: result.stats.rtt.mdev,
        };
        await fetch('/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(log),
        });
      }
      fetchLogs(); // Refresh logs after saving new ones
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchAndSavePings();
    const interval = setInterval(fetchAndSavePings, 60000); // 1 minute

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