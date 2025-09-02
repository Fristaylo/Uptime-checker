import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Log {
  rtt_avg?: number;
  created_at: string;
  packet_loss?: number;
  ttfb?: number;
  status_code?: number;
  dns?: number;
  tcp?: number;
  tls?: number;
  first_byte?: number;
  download?: number;
}

interface CityLogs {
  [city: string]: Log[];
}

interface CountryChartProps {
  cityLogs: CityLogs;
  limit: number;
  dataType: "ping" | "http";
}

const lineColors = ["#ff6384", "#ffcd56", "#ff9f40", "#4bc0c0", "#9966ff"];

const cityTranslations: { [key: string]: string } = {
  Moscow: "Москва",
  "Saint Petersburg": "Санкт-Петербург",
  Kyiv: "Киев",
  Lviv: "Львов",
  Almaty: "Алматы",
  Riga: "Рига",
  Vilnius: "Вильнюс",
  Tallinn: "Таллин",
};

const CountryChart = ({ cityLogs, limit, dataType }: CountryChartProps) => {
  const limitedCityLogs: CityLogs = {};
  for (const city in cityLogs) {
    limitedCityLogs[city] = cityLogs[city].slice(-limit);
  }

  const allLogs = Object.values(limitedCityLogs).flat();
  const labels = [
    ...new Set(
      allLogs.map((log: Log) =>
        new Date(log.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    ),
  ].sort();

  const datasets = Object.entries(limitedCityLogs).map(
    ([city, logs], index) => {
      const color = lineColors[index % lineColors.length];
      const dataMap = new Map(
        (logs as Log[]).map((log: Log) => [
          new Date(log.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          dataType === "ping" ? log.rtt_avg : log.ttfb,
        ])
      );

    return {
      label: cityTranslations[city] || city,
      data: labels.map((label) => dataMap.get(label) || null),
      borderColor: color,
      backgroundColor: `${color}33`,
      pointBackgroundColor: color,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointHitRadius: 20,
      tension: 0.4,
      fill: true,
      spanGaps: true,
    };
  });

  const sortedDatasets = [...datasets].sort((a, b) => {
    const aData = a.data.filter((v): v is number => v !== null);
    const bData = b.data.filter((v): v is number => v !== null);
    const aAvg =
      aData.length > 0
        ? aData.reduce((acc, val) => acc + val, 0) / aData.length
        : 0;
    const bAvg =
      bData.length > 0
        ? bData.reduce((acc, val) => acc + val, 0) / bData.length
        : 0;
    return bAvg - aAvg;
  });

  const chartData = {
    labels,
    datasets: sortedDatasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#d4d4d4",
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        titleFont: {
          size: 16,
        },
        bodyFont: {
          size: 14,
        },
        callbacks: {
          label: function (context: any) {
            const city = context.dataset.label;
            const originalCity =
              Object.keys(cityTranslations).find(
                (key) => cityTranslations[key] === city
              ) || city;
            const allLogsForCity = cityLogs[originalCity] || [];
            const log = allLogsForCity.find(
              (l: Log) =>
                new Date(l.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }) === context.label
            );

            if (!log) return "";

            if (dataType === "ping") {
              return [
                city,
                `Пинг: ${context.parsed.y.toFixed(0)}мс`,
                `Потеря пакетов: ${log.packet_loss}%`,
              ];
            } else {
              return [
                city,
                `Общее время: ${context.parsed.y.toFixed(0)}мс`,
                `Статус: ${log.status_code}`,
                `DNS: ${log.dns}мс`,
                `TCP: ${log.tcp}мс`,
                `TLS: ${log.tls}мс`,
                `Первый байт: ${log.first_byte}мс`,
                `Загрузка: ${log.download}мс`,
              ];
            }
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "#d4d4d4",
          maxTicksLimit: 5,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#d4d4d4",
          maxTicksLimit: 6,
        },
      },
    },
  };

  return <Line options={options} data={chartData} />;
};

export default CountryChart;
