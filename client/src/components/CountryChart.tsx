import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Log {
  rtt_avg: number;
  created_at: string;
  packet_loss: number;
}

interface CountryChartProps {
  country: string;
  logs: Log[];
}

const CountryChart = ({ country, logs }: CountryChartProps) => {
  const chartData = {
    labels: logs.map(log => new Date(log.created_at).toLocaleTimeString()),
    datasets: [
      {
        label: `RTT Avg (ms) for ${country}`,
        data: logs.map(log => log.rtt_avg),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        pointBackgroundColor: logs.map(log => log.packet_loss > 0 ? 'red' : 'rgba(75, 192, 192, 1)'),
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Ping RTT for ${country}`,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const log = logs[context.dataIndex];
            return [
              `RTT: ${context.parsed.y.toFixed(2)} ms`,
              `Packet Loss: ${log.packet_loss}%`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
            display: true,
            text: 'RTT (ms)'
        }
      },
    },
  };

  return <Line options={options} data={chartData} />;
};

export default CountryChart;