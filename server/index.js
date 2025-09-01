const express = require('express');
const pool = require('./db');
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

app.post('/logs', async (req, res) => {
  const {
    probeId,
    country,
    city,
    asn,
    network,
    packetsSent,
    packetsReceived,
    packetLoss,
    rttMin,
    rttMax,
    rttAvg,
    rttMdev,
  } = req.body;

  const query = `
    INSERT INTO ping_logs (
      probe_id, country, city, asn, network, packets_sent, packets_received,
      packet_loss, rtt_min, rtt_max, rtt_avg, rtt_mdev
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `;
  const values = [
    probeId, country, city, asn, network, packetsSent, packetsReceived,
    packetLoss, rttMin, rttMax, rttAvg, rttMdev,
  ];

  try {
    await pool.query(query, values);
    res.status(201).send('Log saved');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  createTable();
});