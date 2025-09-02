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
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Log {
  rtt_avg: number;
  created_at: string;
  packet_loss: number;
}

interface Log {
  rtt_avg: number;
  created_at: string;
  packet_loss: number;
}

interface CityPingLogs {
  [city: string]: Log[];
}

interface CountryChartProps {
  cityLogs: CityPingLogs;
  limit: number;
}

const lineColors = ["#ff6384", "#ffcd56", "#ff9f40", "#4bc0c0", "#9966ff"];

const CountryChart = ({ cityLogs, limit }: CountryChartProps) => {
  const allLogs = Object.values(cityLogs).flat();
  const labels = [
    ...new Set(
      allLogs.map((log: Log) =>
        new Date(log.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    ),
  ]
    .sort()
    .slice(-limit);

  const datasets = Object.entries(cityLogs).map(([city, logs], index) => {
    const color = lineColors[index % lineColors.length];
    const dataMap = new Map(
      (logs as Log[]).slice(-limit).map((log: Log) => [
        new Date(log.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        log.rtt_avg,
      ])
    );

    return {
      label: city,
      data: labels.map((label) => dataMap.get(label) || null),
      borderColor: color,
      backgroundColor: `${color}33`, // Add alpha for fill
      pointBackgroundColor: color,
      pointBorderColor: "#fff",
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.4,
      fill: true,
      spanGaps: true,
    };
  });

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#d4d4d4",
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: function (context: any) {
          // Tooltip Element
          let tooltipEl = document.getElementById("chartjs-tooltip");

          // Create element on first render
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip";
            tooltipEl.innerHTML = "<table></table>";
            document.body.appendChild(tooltipEl);
          }

          // Hide if no tooltip
          const tooltipModel = context.tooltip;
          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
          }

          // Set caret Position
          tooltipEl.classList.remove("above", "below", "no-transform");
          if (tooltipModel.yAlign) {
            tooltipEl.classList.add(tooltipModel.yAlign);
          } else {
            tooltipEl.classList.add("no-transform");
          }

          function getBody(bodyItem: any) {
            return bodyItem.lines;
          }

          // Set Text
          if (tooltipModel.body) {
            const titleLines = tooltipModel.title || [];
            const bodyLines = tooltipModel.body.map(getBody);

            let innerHtml = "<thead>";

            titleLines.forEach(function (title: any) {
              innerHtml += "<tr><th>" + title + "</th></tr>";
            });
            innerHtml += "</thead><tbody>";

            bodyLines.forEach(function (body: any, i: number) {
              const colors = tooltipModel.labelColors[i];
              let style = "background:" + colors.backgroundColor;
              style += "; border-color:" + colors.borderColor;
              style += "; border-width: 2px";
              const span = '<span style="' + style + '"></span>';
              innerHtml += "<tr><td>" + span + body + "</td></tr>";
            });
            innerHtml += "</tbody>";

            let table = tooltipEl.querySelector("table");
            if (table) {
              table.innerHTML = innerHtml;
            }
          }

          const position = context.chart.canvas.getBoundingClientRect();

          // Display, position, and set styles for font
          tooltipEl.style.opacity = "1";
          tooltipEl.style.position = "absolute";
          tooltipEl.style.left =
            position.left + window.pageXOffset + tooltipModel.caretX + "px";
          tooltipEl.style.top =
            position.top + window.pageYOffset + tooltipModel.caretY + "px";
          tooltipEl.style.font = '1rem "Helvetica Neue", sans-serif';
          tooltipEl.style.padding =
            tooltipModel.padding + "px " + tooltipModel.padding + "px";
          tooltipEl.style.pointerEvents = "none";
          tooltipEl.style.background = "#333";
          tooltipEl.style.color = "white";
          tooltipEl.style.borderRadius = "3px";
        },
        callbacks: {
          label: function (context: any) {
            const city = context.dataset.label;
            const allLogsForCity = cityLogs[city] || [];
            const log = allLogsForCity.find(
              (l: Log) =>
                new Date(l.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }) === context.label
            );

            if (!log) return "";

            return [
              `RTT: ${context.parsed.y.toFixed(2)} ms`,
              `Packet Loss: ${log.packet_loss}%`,
            ];
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
