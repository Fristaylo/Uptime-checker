const express = require("express");
const pool = require("./db");
const fetch = require("node-fetch");
const app = express();
const port = 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self';"
  );
  next();
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS ping_logs (
      id SERIAL PRIMARY KEY,
      probe_id VARCHAR(255),
      country VARCHAR(2),
      city VARCHAR(255),
      asn INT,
      network VARCHAR(255),
      packets_sent INT,
      packets_received INT,
      packet_loss FLOAT,
      rtt_min FLOAT,
      rtt_max FLOAT,
      rtt_avg FLOAT,
      rtt_mdev FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Table "ping_logs" created or already exists.');
  } catch (err) {
    console.error("Error creating table", err);
  }
};

app.get("/logs", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT country, json_agg(json_build_object('rtt_avg', rtt_avg, 'created_at', created_at, 'packet_loss', packet_loss) ORDER BY created_at ASC) as logs
      FROM ping_logs
      WHERE created_at >= NOW() - interval '1 day'
      GROUP BY country;
    `);
    const logsByCountry = rows.reduce((acc, row) => {
      acc[row.country] = row.logs;
      return acc;
    }, {});
    res.json(logsByCountry);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

const performPingCycle = async () => {
  const target = 'site.yummyani.me';
  const countries = ['RU', 'UA', 'LV', 'LT', 'EE', 'KZ'];
  const apiKey = process.env.GLOBALPING_API_KEY;
  console.log(`[${new Date().toISOString()}] Starting new ping cycle...`);

  try {
    const createMeasurementResponse = await fetch(
      "https://api.globalping.io/v1/measurements",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          target,
          locations: countries.map(country => ({ country, limit: 1 })),
          type: "ping",
        }),
      }
    );

    if (!createMeasurementResponse.ok) {
      const errorBody = await createMeasurementResponse.text();
      throw new Error(
        `Failed to create measurement: ${createMeasurementResponse.status} ${createMeasurementResponse.statusText}. Body: ${errorBody}`
      );
    }

    const { id } = await createMeasurementResponse.json();
    console.log(`Measurement created with ID: ${id}`);

    let resultData;
    const startTime = Date.now();
    const timeout = 30000;

    while (Date.now() - startTime < timeout) {
      const getResultResponse = await fetch(
        `https://api.globalping.io/v1/measurements/${id}`
      );
      if (getResultResponse.ok) {
        resultData = await getResultResponse.json();
        if (resultData.status === 'finished') {
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!resultData) {
      throw new Error(`Could not retrieve measurement ${id}.`);
    }

    for (const result of resultData.results) {
      const { probe, result: pingResult } = result;
      let values;

      if (pingResult.status === 'finished' && pingResult.stats) {
        const { stats } = pingResult;
        values = [id, probe.country, probe.city, probe.asn, probe.network, stats.total, stats.rcv, stats.loss, stats.min, stats.max, stats.avg, stats.mdev || 0];
      } else {
        console.log(`Probe for ${probe.country} has status: '${pingResult.status}'. Logging as 100% packet loss.`);
        values = [id, probe.country, probe.city, probe.asn, probe.network, 3, 0, 100, null, null, null, null];
      }

      const query = `
        INSERT INTO ping_logs (probe_id, country, city, asn, network, packets_sent, packets_received, packet_loss, rtt_min, rtt_max, rtt_avg, rtt_mdev)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      await pool.query(query, values);
    }
    console.log(`[${new Date().toISOString()}] Ping cycle completed successfully.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Ping cycle failed:`, err.message);
  }
};

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  createTable();
  
  // Run the cycle once on startup, then set an interval.
  performPingCycle();
  setInterval(performPingCycle, 120000); // 2 minutes
});
