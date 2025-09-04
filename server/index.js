require("dotenv").config();
const express = require("express");
const pool = require("./db");
const fetch = require("node-fetch");
const app = express();
const port = 3000;

app.use(express.json());

const createHttpTable = async () => {
  try {
    await pool.query("DROP TABLE IF EXISTS http_logs;");
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

let clients = [];

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res,
  };
  clients.push(newClient);
  console.log(`Client ${clientId} connected`);

  req.on("close", () => {
    clients = clients.filter((client) => client.id !== clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

const sendToAllClients = (data) => {
  clients.forEach((client) =>
    client.res.write(`data: ${JSON.stringify(data)}\n\n`)
  );
};

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
        const result = resultsByLocation.get(
          `${location.city}-${location.country}`
        );
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
            }: Status ${
              result ? result.result.status.toUpperCase() : "UNKNOWN"
            }`
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
      sendToAllClients({ type: "http" });
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
    }
  }
};

const cleanupOldLogs = async () => {
  console.log(
    `--- Running cleanup of old logs at ${new Date().toISOString()} ---`
  );
  try {
    const httpLogsQuery = `DELETE FROM http_logs WHERE created_at < NOW() - INTERVAL '7 days'`;

    const httpResult = await pool.query(httpLogsQuery);

    console.log(
      `Cleanup successful. Removed ${httpResult.rowCount} from http_logs.`
    );
  } catch (err) {
    console.error("Failed to cleanup old logs:", err.message);
  }
};

app.listen(port, async () => {
  console.log(`Server listening at http://localhost:${port}`);
  await createHttpTable();
  await cleanupOldLogs();
  httpCheckAndSave(); // Run once on startup
  setInterval(httpCheckAndSave, 120000); // Run every 1 minute
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000); // Run once a day
});
