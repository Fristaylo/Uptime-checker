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
    const { rows } = await pool.query(
      "SELECT * FROM ping_logs WHERE created_at >= NOW() - interval '1 day' ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.post("/ping", async (req, res) => {
  const { target } = req.body;
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
          limit: 1,
          type: "ping",
        }),
      }
    );

    if (!createMeasurementResponse.ok) {
      throw new Error(
        `HTTP error! status: ${createMeasurementResponse.status}`
      );
    }

    const { id } = await createMeasurementResponse.json();
    console.log(`Measurement created with ID: ${id}`);

    // Step 2: Wait a few seconds for the measurement to complete
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds delay

    // Step 3: Fetch the results
    const getResultResponse = await fetch(
      `https://api.globalping.io/v1/measurements/${id}`
    );
    if (!getResultResponse.ok) {
      throw new Error(`HTTP error! status: ${getResultResponse.status}`);
    }

    const resultData = await getResultResponse.json();
    console.log(
      "Result from Globalping API:",
      JSON.stringify(resultData, null, 2)
    );
    const result = resultData.results[0]; // Get the first result from the array

    // Step 4: Save to database
    const { probe, result: pingResult } = result; // Destructure for easier access
    const { stats } = pingResult;

    // Step 4: Save to database
    const values = [
      probe.id,
      probe.country,
      probe.city,
      probe.asn,
      probe.network,
      stats.total, // packetsSent
      stats.rcv, // packetsReceived
      stats.loss, // packetLoss
      stats.min, // rttMin
      stats.max, // rttMax
      stats.avg, // rttAvg
      stats.mdev || 0, // rttMdev (sometimes null)
    ];

    console.log("Saving the following values to DB:", values);

    const query = `
    INSERT INTO ping_logs (
      probe_id, country, city, asn, network, packets_sent, packets_received,
      packet_loss, rtt_min, rtt_max, rtt_avg, rtt_mdev
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `;

    await pool.query(query, values);
    console.log("Successfully saved to DB.");
    res.status(201).send("Ping successful and log saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  createTable();
});
