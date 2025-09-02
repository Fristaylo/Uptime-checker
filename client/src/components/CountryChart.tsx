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

interface CountryChartProps {
  logs: Log[];
  lineColor?: string;
}

const CountryChart = ({
  logs,
  lineColor = "#d4af37",
}: CountryChartProps) => {
  const chartData = {
    labels: logs.map((log) =>
      new Date(log.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    ),
    datasets: [
      {
        label: "Milliseconds",
        data: logs.map((log) => log.rtt_avg),
        borderColor: lineColor,
        backgroundColor: "rgba(212, 175, 55, 0.2)",
        pointBackgroundColor: lineColor,
        pointBorderColor: "#fff",
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: true,
      },
    ],
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
            const log = logs[context.dataIndex];
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
