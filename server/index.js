const express = require("express");
const pool = require("./db");
const fetch = require("node-fetch");
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

app.post("/ping", async (req, res) => {
  const { target, countries } = req.body;
  const apiKey = process.env.GLOBALPING_API_KEY;

  if (!target) {
    return res.status(400).send("Target is required");
  }
  try {
    // Step 1: Create the measurement
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
      console.error(
        `Failed to create measurement: ${createMeasurementResponse.status} ${createMeasurementResponse.statusText}. Body: ${errorBody}`
      );
      // Send a non-fatal response to the client so the UI doesn't break
      res.status(200).json({ message: "Failed to create measurement, server will retry." });
      return;
    }

    const { id } = await createMeasurementResponse.json();
    console.log(`Measurement created with ID: ${id}`);

    // Step 2: Wait a few seconds for the measurement to complete
    // Step 2 & 3: Poll for the measurement result until it's finished
    let resultData;
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds timeout

    while (Date.now() - startTime < timeout) {
      const getResultResponse = await fetch(
        `https://api.globalping.io/v1/measurements/${id}`
      );

      if (!getResultResponse.ok) {
        // If the API returns a server error, wait and retry. Otherwise, fail immediately.
        if (getResultResponse.status >= 500) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
            continue;
        }
        throw new Error(`HTTP error! status: ${getResultResponse.status}`);
      }

      resultData = await getResultResponse.json();

      if (resultData.status === 'finished') {
        break; // Exit loop if measurement is finished
      }
      
      // Wait for 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!resultData || resultData.status !== 'finished') {
        throw new Error(`Measurement ${id} did not complete in time.`);
    }
    if (!resultData) {
      // This can happen if the API call fails consistently.
      throw new Error(`Could not retrieve measurement ${id}.`);
    }

    for (const result of resultData.results) {
      const { probe, result: pingResult } = result;
      let values;

      if (pingResult.status === 'finished' && pingResult.stats) {
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
        // If the probe failed or is not finished, log it as 100% packet loss
        console.log(`Probe for ${probe.country} has status: '${pingResult.status}'. Logging as 100% packet loss.`);
        values = [
          id,
          probe.country,
          probe.city,
          probe.asn,
          probe.network,
          3,    // packetsSent (assumed)
          0,    // packetsReceived
          100,  // packetLoss
          null, // rttMin
          null, // rttMax
          null, // rttAvg
          null, // rttMdev
        ];
      }

      console.log("Saving the following values to DB:", values);

      const query = `
      INSERT INTO ping_logs (
        probe_id, country, city, asn, network, packets_sent, packets_received,
        packet_loss, rtt_min, rtt_max, rtt_avg, rtt_mdev
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

      await pool.query(query, values);
      console.log(`Successfully saved log for ${probe.country} to DB.`);
    }
    res.status(201).json({ message: "Ping measurement processed" });
  } catch (err) {
    console.error("Failed to complete ping measurement cycle:", err.message);
    // We send a 200 OK response so the frontend doesn't show a fatal error.
    // The frontend will simply fetch the existing logs again on its next interval.
    // The actual error is logged on the server for debugging.
    res.status(200).json({ message: "Ping cycle failed, server will retry." });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  createTable();
});
