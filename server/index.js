const express = require("express");
const pool = require("./db");
const fetch = require("node-fetch");
const path = require("path");
const app = express();
const port = 3000;

app.use(express.json());

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
  } catch (err) {
    console.error("Error creating table", err);
  }
};

const createHttpTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS http_logs (
      id SERIAL PRIMARY KEY,
      probe_id VARCHAR(255),
      country VARCHAR(2),
      city VARCHAR(255),
      asn INT,
      network VARCHAR(255),
      status_code INT,
      ttfb FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Table "http_logs" created or already exists.');
  } catch (err) {
    console.error("Error creating table", err);
  }
};

app.get("/api/logs", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        country,
        city,
        json_agg(json_build_object('rtt_avg', rtt_avg, 'created_at', created_at, 'packet_loss', packet_loss) ORDER BY created_at ASC) as logs
      FROM
        ping_logs
      WHERE
        created_at >= NOW() - interval '1 day' AND city IS NOT NULL
      GROUP BY
        country, city;
    `);
    const logsByCountryCity = rows.reduce((acc, row) => {
      if (!acc[row.country]) {
        acc[row.country] = {};
      }
      acc[row.country][row.city] = row.logs;
      return acc;
    }, {});
    res.json(logsByCountryCity);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/api/http-logs", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        country,
        city,
        json_agg(json_build_object('status_code', status_code, 'created_at', created_at, 'ttfb', ttfb) ORDER BY created_at ASC) as logs
      FROM
        http_logs
      WHERE
        created_at >= NOW() - interval '1 day' AND city IS NOT NULL
      GROUP BY
        country, city;
    `);
    const logsByCountryCity = rows.reduce((acc, row) => {
      if (!acc[row.country]) {
        acc[row.country] = {};
      }
      acc[row.country][row.city] = row.logs;
      return acc;
    }, {});
    console.log("Sending data to client:", JSON.stringify(logsByCountryCity, null, 2));
    res.json(logsByCountryCity);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

const pingAndSave = async () => {
  console.log(`--- Starting PING check cycle at ${new Date().toISOString()} ---`);
  const target = "site.yummyani.me";
  const locations = [
    { country: "RU", city: "Moscow" },
    { country: "RU", city: "Saint Petersburg" },
    { country: "UA", city: "Kyiv" },
    { country: "UA", city: "Lviv" },
    { country: "KZ", city: "Astana" },
    { country: "LV", city: "Riga" },
    { country: "LT", city: "Vilnius" },
    { country: "EE", city: "Tallinn" },
  ];
  const apiKey = process.env.GLOBALPING_API_KEY;

  if (!target) {
    console.error("Target is not defined");
    return;
  }
  try {
    // Step 1: Create the measurement
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        target,
        locations: locations.map((location) => ({ ...location, limit: 1 })),
        type: "ping",
      }),
    };
    const createMeasurementResponse = await fetch(
      "https://api.globalping.io/v1/measurements",
      requestOptions
    );

    if (!createMeasurementResponse.ok) {
      const errorBody = await createMeasurementResponse.text();
      console.error(
        `Failed to create measurement: ${createMeasurementResponse.status} ${createMeasurementResponse.statusText}. Body: ${errorBody}`
      );
      return;
    }

    const { id } = await createMeasurementResponse.json();
    console.log(`[PING] Measurement created with ID: ${id}`);

    // Step 2 & 3: Poll for the measurement result until it's finished
    let resultData;
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds timeout

    while (Date.now() - startTime < timeout) {
      const getResultResponse = await fetch(
        `https://api.globalping.io/v1/measurements/${id}`
      );

      if (!getResultResponse.ok) {
        if (getResultResponse.status >= 500) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error(`HTTP error! status: ${getResultResponse.status}`);
      }

      resultData = await getResultResponse.json();

      if (resultData.status === "finished") {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!resultData || resultData.status !== "finished") {
      throw new Error(`Measurement ${id} did not complete in time.`);
    }

    for (const result of resultData.results) {
      const { probe, result: pingResult } = result;
      let values;

      if (pingResult.status === "finished" && pingResult.stats) {
        const { stats } = pingResult;
        values = [
          id,
          probe.country,
          probe.city,
          probe.asn,
          probe.network,
          stats.total,
          stats.rcv,
          stats.loss,
          stats.min,
          stats.max,
          stats.avg,
          stats.mdev || 0,
        ];
      } else {
        values = [
          id,
          probe.country,
          probe.city,
          probe.asn,
          probe.network,
          3,
          0,
          100,
          null,
          null,
          null,
          null,
        ];
      }

      const query = `
      INSERT INTO ping_logs (
        probe_id, country, city, asn, network, packets_sent, packets_received,
        packet_loss, rtt_min, rtt_max, rtt_avg, rtt_mdev
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

      await pool.query(query, values);
    }
    console.log(`--- PING check cycle for measurement ${id} completed. ---`);
  } catch (err) {
    console.error("Failed to complete ping measurement cycle:", err.message);
  }
};

const httpCheckAndSave = async () => {
  console.log(`--- Starting HTTP check cycle at ${new Date().toISOString()} ---`);
  const target = "site.yummyani.me";
  const locations = [
    { country: "RU", city: "Moscow" },
    { country: "RU", city: "Saint Petersburg" },
    { country: "UA", city: "Kyiv" },
    { country: "UA", city: "Lviv" },
    { country: "KZ", city: "Astana" },
    { country: "LV", city: "Riga" },
    { country: "LT", city: "Vilnius" },
    { country: "EE", city: "Tallinn" },
  ];
  const apiKey = process.env.GLOBALPING_API_KEY;

  if (!target) {
    console.error("Target is not defined");
    return;
  }
  try {
    // Step 1: Create the measurement
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        target: target,
        locations: locations.map((location) => ({ ...location, limit: 1 })),
        type: "http",
        measurementOptions: {
          protocol: "HTTPS",
        },
      }),
    };
    const createMeasurementResponse = await fetch(
      "https://api.globalping.io/v1/measurements",
      requestOptions
    );

    if (!createMeasurementResponse.ok) {
      const errorBody = await createMeasurementResponse.text();
      console.error(
        `Failed to create measurement: ${createMeasurementResponse.status} ${createMeasurementResponse.statusText}. Body: ${errorBody}`
      );
      return;
    }

    const { id } = await createMeasurementResponse.json();
    console.log(`[HTTP] Measurement created with ID: ${id}`);

    // Step 2 & 3: Poll for the measurement result until it's finished
    let resultData;
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds timeout

    while (Date.now() - startTime < timeout) {
      const getResultResponse = await fetch(
        `https://api.globalping.io/v1/measurements/${id}`
      );

      if (!getResultResponse.ok) {
        if (getResultResponse.status >= 500) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error(`HTTP error! status: ${getResultResponse.status}`);
      }

      resultData = await getResultResponse.json();

      if (resultData.status === "finished") {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!resultData || resultData.status !== "finished") {
      throw new Error(`Measurement ${id} did not complete in time.`);
    }

    for (const result of resultData.results) {
      const { probe, result: httpResult } = result;
      let values;

      if (httpResult.status === "finished") {
        console.log(
          `[SUCCESS] HTTP check to ${probe.city}, ${probe.country}: Status ${httpResult.statusCode}`
        );
        values = [
          id,
          probe.country,
          probe.city,
          probe.asn,
          probe.network,
          httpResult.statusCode,
          httpResult.timings.total,
        ];
      } else {
        console.log(
          `[FAILURE] HTTP check to ${probe.city}, ${
            probe.country
          }: Status ${httpResult.status.toUpperCase()}`
        );
        values = [
          id,
          probe.country,
          probe.city,
          probe.asn,
          probe.network,
          null,
          null,
        ];
      }

      const query = `
      INSERT INTO http_logs (
        probe_id, country, city, asn, network, status_code, ttfb
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

      await pool.query(query, values);
    }
    console.log(`--- HTTP check cycle for measurement ${id} completed. ---`);
  } catch (err) {
    console.error("Failed to complete HTTP measurement cycle:", err.message);
  }
};

// Serve static files from the React app after API routes
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  createTable();
  createHttpTable();
  pingAndSave(); // Run once on startup
  httpCheckAndSave(); // Run once on startup
  setInterval(pingAndSave, 120000); // Run every 2 minutes
  setInterval(httpCheckAndSave, 120000); // Run every 2 minutes
});