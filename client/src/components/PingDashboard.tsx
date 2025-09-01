import { useState, useEffect } from 'react';
import styles from './PingDashboard.module.scss';

const PingDashboard = () => {
  const [pingData, setPingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPingData = async () => {
      try {
        const response = await fetch('https://api.globalping.io/v1/measurements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_GLOBALPING_API_KEY}`,
          },
          body: JSON.stringify({
            "locations": [
              {
                "continent": "EU",
                "limit": 1
              }
            ],
            "limit": 1,
            "type": "ping",
            "target": "github.com"
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPingData(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPingData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.pingDashboard}>
      <h2>Ping Results</h2>
      <pre>{JSON.stringify(pingData, null, 2)}</pre>
    </div>
  );
};

export default PingDashboard;