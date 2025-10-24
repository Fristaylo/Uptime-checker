import dotenv from "dotenv";
dotenv.config();
import express from "express";
import pool from "./db.js";
import fetch from "node-fetch";
const app = express();
const port = 3000;

app.use(express.json());

const createHttpTable = async () => {
  try {
    const query = `
    CREATE TABLE IF NOT EXISTS http_logs (
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


app.get("/http-logs", async (req, res) => {
  try {
    const { timeRange, domain } = req.query;
    let interval;
    switch (timeRange) {
      case "month":
        interval = "1 month";
        break;
      case "week":
        interval = "7 day";
        break;
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

    let query;
    let params;

    if (domain) {
      query = `
        SELECT
          country, city, status_code, created_at, total_time,
          download_time, first_byte_time, dns_time, tls_time, tcp_time
        FROM http_logs
        WHERE created_at >= NOW() - $1::interval AND city IS NOT NULL AND domain = $2
        ORDER BY created_at ASC;
      `;
      params = [interval, domain];
    } else {
      query = `
        SELECT
          domain, country, city, status_code, created_at, total_time,
          download_time, first_byte_time, dns_time, tls_time, tcp_time
        FROM http_logs
        WHERE created_at >= NOW() - $1::interval AND city IS NOT NULL
        ORDER BY created_at ASC;
      `;
      params = [interval];
    }

    const { rows } = await pool.query(query, params);

    if (domain) {
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
    } else {
      res.json(rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

const domains = [
  { name: "site.yummyani.me", apiKeyEnv: "GLOBALPING_API_KEY" },
  { name: "ru.yummyani.me", apiKeyEnv: "GLOBALPING_API_KEY2" },
  { name: "en.yummyani.me", apiKeyEnv: "GLOBALPING_API_KEY3" },
  { name: "site.yummy-ani.me", apiKeyEnv: "GLOBALPING_API_KEY4" },
];

const locationGroups = {
  "2min": [
    { country: "RU", city: "Moscow" },
    { country: "RU", city: "Saint Petersburg" },
    { country: "UA", city: "Kyiv" },
    { country: "UA", city: "Lviv" },
    { country: "KZ", city: "Almaty" },
    
    { country: "BY", city: "Minsk" },
  ],
  "5min": [
    { country: "DE", city: "Berlin" },
    { country: "DE", city: "Dusseldorf" },
    { country: "KG", city: "Bishkek" },
    { country: "PL", city: "Warsaw" },
    { country: "PL", city: "Krakow" },
  ],
  "6min": [
    { country: "LV", city: "Riga" },
    { country: "LT", city: "Vilnius" },
    { country: "LT", city: "Siauliai" },
    { country: "EE", city: "Tallinn" },
    { country: "US", city: "New York" },
    { country: "US", city: "Los Angeles" },
    { country: "NL", city: "Amsterdam" },
    { country: "NL", city: "Utrecht" },
    { country: "GB", city: "London" },
    { country: "GB", city: "Woking" },
    { country: "MD", city: "Chisinau" },
    { country: "CZ", city: "Prague" },
    { country: "CZ", city: "Brno" },
    { country: "GE", city: "Tbilisi" },
    { country: "AM", city: "Yerevan" },
  ],
};

const httpCheckAndSave = async (locations) => {
  console.log(
    `--- Starting HTTP check cycle at ${new Date().toISOString()} for ${
      locations.length
    } locations ---`
  );
  for (const domain of domains) {
    const target = domain.name;
    const apiKey = process.env[domain.apiKeyEnv];
    if (!apiKey) {
      console.error(`${domain.apiKeyEnv} is not set.`);
      continue;
    }

    if (!target) {
      console.error("Target is not defined");
      continue;
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
        continue;
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

app.get("/locations", (req, res) => {
  res.json(locationGroups);
});

app.listen(port, async () => {
  console.log(`Server listening at http://localhost:${port}`);
  await createHttpTable();
  

  const runChecks = (locations) => {
    httpCheckAndSave(locations).catch((err) =>
      console.error("Check cycle failed:", err)
    );
  };

  // Initial run
  runChecks(locationGroups["2min"]);

  // Scheduled runs
  setInterval(() => runChecks(locationGroups["2min"]), 3 * 60 * 1000);
  setInterval(() => runChecks(locationGroups["5min"]), 6 * 60 * 1000);
  setInterval(() => runChecks(locationGroups["6min"]), 7 * 60 * 1000);
  
});