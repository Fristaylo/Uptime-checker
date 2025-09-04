require("dotenv").config();
const express = require("express");
const pool = require("./db");
const fetch = require("node-fetch");
const app = express();
const port = 3000;

app.use(express.json());

const createTable = async () => {
  try {
    await pool.query('DROP TABLE IF EXISTS ping_logs;');
    const query = `
    CREATE TABLE ping_logs (
      id SERIAL PRIMARY KEY,
      probe_id VARCHAR(255),
      domain VARCHAR(255),
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
    await pool.query(query);
  } catch (err) {
    console.error("Error creating table", err);
  }
};

const createHttpTable = async () => {
  try {
    await pool.query('DROP TABLE IF EXISTS http_logs;');
    const query = `
    CREATE TABLE http_logs (
      id SERIAL PRIMARY KEY,
      probe_id VARCHAR(255),
      domain VARCHAR(255),
      country VARCHAR(2),
      city VARCHAR(255),
      asn INT,
      network VARCHAR(255),
      status_code INT,
      total_time FLOAT,
      download_time FLOAT,
      first_byte_time FLOAT,
      dns_time FLOAT,
      tls_time FLOAT,
      tcp_time FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
    await pool.query(query);
    console.log('Table "http_logs" created or already exists.');
  } catch (err) {
    console.error("Error creating table", err);
  }
};

app.get("/logs", async (req, res) => {
  try {
    const { timeRange, domain } = req.query;
    let interval;
    switch (timeRange) {
      case "day":
        interval = "1 day";
        break;
      case "4hours":
        interval = "4 hour";
        break;
      case "hour":
        interval = "1 hour";
        break;
      case "30minutes":
        interval = "30 minute";
        break;
      default:
        interval = "1 hour";
    }
    const { rows } = await pool.query(
      `
      SELECT
        country,
        city,
        rtt_avg,
        created_at,
        packet_loss
      FROM
        ping_logs
      WHERE
        created_at >= NOW() - $1::interval AND city IS NOT NULL AND domain = $2
      ORDER BY created_at ASC;
    `,
      [interval, domain]
    );
    const logsByCountryCity = {};
    for (const row of rows) {
      const { country, city, ...logData } = row;
      if (!logsByCountryCity[country]) {
        logsByCountryCity[country] = {};
      }
      if (!logsByCountryCity[country][city]) {
        logsByCountryCity[country][city] = [];
      }
      logsByCountryCity[country][city].push(logData);
    }
    res.json(logsByCountryCity);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/http-logs", async (req, res) => {
  try {
    const { timeRange, domain } = req.query;
    let interval;
    switch (timeRange) {
      case "day":
        interval = "1 day";
        break;
      case "4hours":
        interval = "4 hour";
        break;
      case "hour":
        interval = "1 hour";
        break;
      case "30minutes":
        interval = "30 minute";
        break;
      default:
        interval = "1 hour";
    }

    const { rows } = await pool.query(
      `
      SELECT
        country, city, status_code, created_at, total_time,
        download_time, first_byte_time, dns_time, tls_time, tcp_time
      FROM http_logs
      WHERE created_at >= NOW() - $1::interval AND city IS NOT NULL AND domain = $2
      ORDER BY created_at ASC;
    `,
      [interval, domain]
    );
    const logsByCountryCity = {};
    for (const row of rows) {
      const { country, city, ...logData } = row;
      if (!logsByCountryCity[country]) {
        logsByCountryCity[country] = {};
      }
      if (!logsByCountryCity[country][city]) {
        logsByCountryCity[country][city] = [];
      }
      logsByCountryCity[country][city].push(logData);
    }
    res.json(logsByCountryCity);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

const domains = ["site.yummyani.me", "ru.yummyani.me"];

const pingAndSave = async () => {
  console.log(
    `--- Starting PING check cycle at ${new Date().toISOString()} ---`
  );
  for (const target of domains) {
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
  if (!apiKey) {
    console.error("GLOBALPING_API_KEY is not set.");
    return;
  }

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

    const resultsByLocation = new Map(
      resultData.results.map((r) => [`${r.probe.city}-${r.probe.country}`, r])
    );

    for (const location of locations) {
      const result = resultsByLocation.get(`${location.city}-${location.country}`);
      let values;

      if (result && result.result.status === "finished" && result.result.stats) {
        const { probe, result: pingResult } = result;
        const { stats } = pingResult;
        values = [
          id,
          target,
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
          target,
          location.country,
          location.city,
          null,
          null,
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
        probe_id, domain, country, city, asn, network, packets_sent, packets_received,
        packet_loss, rtt_min, rtt_max, rtt_avg, rtt_mdev
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;

      await pool.query(query, values);
    }
    console.log(`--- PING check cycle for measurement ${id} completed. ---`);
  } catch (err) {
    console.error("Failed to complete ping measurement cycle:", err.message);
    // Insert nulls for all locations on failure
    for (const location of locations) {
      const query = `
      INSERT INTO ping_logs (
        probe_id, domain, country, city, asn, network, packets_sent, packets_received,
        packet_loss, rtt_min, rtt_max, rtt_avg, rtt_mdev
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
      await pool.query(query, [
        "failed",
        target,
        location.country,
        location.city,
        null,
        null,
        3,
        0,
        100,
        null,
        null,
        null,
        null,
      ]);
    }
  }}
};

const httpCheckAndSave = async () => {
  console.log(
    `--- Starting HTTP check cycle at ${new Date().toISOString()} ---`
  );
  for (const target of domains) {
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
  if (!apiKey) {
    console.error("GLOBALPING_API_KEY is not set.");
    return;
  }

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

    const resultsByLocation = new Map(
      resultData.results.map((r) => [`${r.probe.city}-${r.probe.country}`, r])
    );

    for (const location of locations) {
      const result = resultsByLocation.get(`${location.city}-${location.country}`);
      let values;

      if (result && result.result.status === "finished") {
        const { probe, result: httpResult } = result;
        console.log(
          `[SUCCESS] HTTP check to ${probe.city}, ${probe.country}: Status ${httpResult.statusCode}`
        );
        values = [
          id,
          target,
          probe.country,
          probe.city,
          probe.asn,
          probe.network,
          httpResult.statusCode,
          httpResult.timings.total || null,
          httpResult.timings.download || null,
          httpResult.timings.firstByte || null,
          httpResult.timings.dns || null,
          httpResult.timings.tls || null,
          httpResult.timings.tcp || null,
        ];
      } else {
        console.log(
          `[FAILURE] HTTP check to ${location.city}, ${
            location.country
          }: Status ${result ? result.result.status.toUpperCase() : "UNKNOWN"}`
        );
        values = [
          id,
          target,
          location.country,
          location.city,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ];
      }

      const query = `
      INSERT INTO http_logs (
        probe_id, domain, country, city, asn, network, status_code, total_time, download_time, first_byte_time, dns_time, tls_time, tcp_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;

      await pool.query(query, values);
    }
    console.log(`--- HTTP check cycle for measurement ${id} completed. ---`);
  } catch (err) {
    console.error("Failed to complete HTTP measurement cycle:", err.message);
    for (const location of locations) {
      const query = `
      INSERT INTO http_logs (
        probe_id, domain, country, city, asn, network, status_code, total_time, download_time, first_byte_time, dns_time, tls_time, tcp_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
      await pool.query(query, [
        "failed",
        target,
        location.country,
        location.city,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
    }
  }}
};

const cleanupOldLogs = async () => {
  console.log(`--- Running cleanup of old logs at ${new Date().toISOString()} ---`);
  try {
    const pingLogsQuery = `DELETE FROM ping_logs WHERE created_at < NOW() - INTERVAL '7 days'`;
    const httpLogsQuery = `DELETE FROM http_logs WHERE created_at < NOW() - INTERVAL '7 days'`;

    const pingResult = await pool.query(pingLogsQuery);
    const httpResult = await pool.query(httpLogsQuery);

    console.log(`Cleanup successful. Removed ${pingResult.rowCount} from ping_logs and ${httpResult.rowCount} from http_logs.`);
  } catch (err) {
    console.error("Failed to cleanup old logs:", err.message);
  }
};

app.listen(port, async () => {
  console.log(`Server listening at http://localhost:${port}`);
  await createTable();
  await createHttpTable();
  await cleanupOldLogs();
  pingAndSave(); // Run once on startup
  httpCheckAndSave(); // Run once on startup
  setInterval(pingAndSave, 120000); // Run every 2 minutes
  setInterval(httpCheckAndSave, 120000); // Run every 2 minutes
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000); // Run once a day
});