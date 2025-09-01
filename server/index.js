const express = require('express');
const pool = require('./db');
const fetch = require('node-fetch');
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
    console.error('Error creating table', err);
  }
};

app.get('/logs', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ping_logs WHERE created_at >= NOW() - interval \'1 day\' ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.post('/ping', async (req, res) => {
  const { target } = req.body;
  const apiKey = process.env.GLOBALPING_API_KEY;

  if (!target) {
    return res.status(400).send('Target is required');
  }

  try {
    const response = await fetch('https://api.globalping.io/v1/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        target,
        limit: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const result = data.results;

    const query = `
      INSERT INTO ping_logs (
        probe_id, country, city, asn, network, packets_sent, packets_received,
        packet_loss, rtt_min, rtt_max, rtt_avg, rtt_mdev
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    const values = [
      result.probe.id,
      result.probe.location.country,
      result.probe.location.city,
      result.probe.location.asn,
      result.probe.location.network,
      result.stats.packetsSent,
      result.stats.packetsReceived,
      result.stats.packetLoss,
      result.stats.rtt.min,
      result.stats.rtt.max,
      result.stats.rtt.avg,
      result.stats.rtt.mdev,
    ];

    await pool.query(query, values);
    res.status(201).send('Ping successful and log saved');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  createTable();
});