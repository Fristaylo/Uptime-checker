import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const HttpDashboard: React.FC = () => {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/http-logs");
        console.log("Received data:", response.data); // Log the data to the browser console
        setData(response.data);
      } catch (error) {
        console.error("Error fetching HTTP logs:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // Update every 2 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>HTTP Check Dashboard</h2>
      {Object.keys(data).map((country) => (
        <div key={country}>
          <h3>{country}</h3>
          {Object.keys(data[country]).map((city) => (
            <div key={city}>
              <h4>{city}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data[country][city]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="created_at" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="status_code"
                    stroke="#8884d8"
                    name="Status Code"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ttfb"
                    stroke="#82ca9d"
                    name="TTFB (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default HttpDashboard;
