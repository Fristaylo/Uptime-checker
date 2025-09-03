import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  TimeSeriesScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { ru } from "date-fns/locale";
import CrosshairPlugin from "chartjs-plugin-crosshair";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CrosshairPlugin,
  TimeScale,
  TimeSeriesScale
);
interface Log {
  rtt_avg?: number;
  created_at: string;
  packet_loss?: number;
  total_time?: number;
  status_code?: number;
  download_time?: number;
  first_byte_time?: number;
  dns_time?: number;
  tls_time?: number;
  tcp_time?: number;
}

interface CityLogs {
  [city: string]: Log[];
}

interface CountryChartProps {
  cityLogs: CityLogs;
  timeRange: string;
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

const CountryChart = ({ cityLogs, timeRange, dataType }: CountryChartProps) => {
  const datasets = Object.entries(cityLogs).map(([city, logs], index) => {
    const color = lineColors[index % lineColors.length];
    const groupedLogs = logs.reduce((acc, log) => {
      const date = new Date(log.created_at);
      date.setSeconds(0, 0);
      const minuteKey = date.getTime();

      if (!acc[minuteKey]) {
        acc[minuteKey] = [];
      }
      acc[minuteKey].push(log);
      return acc;
    }, {} as { [key: number]: Log[] });

    const data = Object.entries(groupedLogs).map(([key, group]) => {
      const avgValue =
        group.reduce(
          (sum, log) =>
            sum +
            (dataType === "ping" ? log.rtt_avg || 0 : log.total_time || 0),
          0
        ) / group.length;
      const avgPacketLoss =
        group.reduce((sum, log) => sum + (log.packet_loss || 0), 0) /
        group.length;
      // Keep other metrics from the first log in the group for tooltip info
      const representativeLog = group[0];

      return {
        x: parseInt(key),
        y: avgValue,
        packet_loss: avgPacketLoss,
        status_code: representativeLog.status_code,
        dns_time: representativeLog.dns_time,
        tcp_time: representativeLog.tcp_time,
        tls_time: representativeLog.tls_time,
        first_byte_time: representativeLog.first_byte_time,
        download_time: representativeLog.download_time,
      };
    });

    return {
      label: cityTranslations[city] || city,
      data: data,
      borderColor: color,
      backgroundColor: `${color}33`,
      pointBackgroundColor: color,
      pointRadius: 0,
      pointHoverRadius: 7,
      pointHitRadius: 20,
      tension: 0.4,
      fill: true,
      spanGaps: false,
    };
  });

  const sortedDatasets = [...datasets].sort((a, b) => {
    const aData = a.data.map((d) => d.y).filter((v): v is number => v !== null);
    const bData = b.data.map((d) => d.y).filter((v): v is number => v !== null);
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
    datasets: sortedDatasets,
  };

  const getMaxTicksLimit = () => {
    switch (timeRange) {
      case "day":
        return 6;
      case "4hours":
        return 6;
      case "hour":
        return 6;
      case "30minutes":
        return 6;
      default:
        return 6;
    }
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
        enabled: false,
        external: function (context: any) {
          let tooltipEl = document.getElementById("chartjs-tooltip");

          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip";
            tooltipEl.innerHTML = "<table></table>";
            document.body.appendChild(tooltipEl);
          }

          const tooltipModel = context.tooltip;
          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
          }

          tooltipEl.classList.remove("above", "below", "no-transform");
          if (tooltipModel.yAlign) {
            tooltipEl.classList.add(tooltipModel.yAlign);
          } else {
            tooltipEl.classList.add("no-transform");
          }

          function getBody(bodyItem: any) {
            return bodyItem.lines;
          }

          if (tooltipModel.body) {
            const titleLines = tooltipModel.title || [];
            const bodyLines = tooltipModel.body.map(getBody);

            let innerHtml = "<thead>";

            titleLines.forEach(function (index: number) {
              const dp = tooltipModel.dataPoints[index];
              const formattedDate = new Date(dp.parsed.x).toLocaleDateString(
                "ru-RU",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }
              );
              const formattedTime = new Date(dp.parsed.x).toLocaleTimeString(
                "ru-RU",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );
              innerHtml +=
                "<tr><th>" +
                formattedDate +
                " в " +
                formattedTime +
                "</th></tr>";
            });
            innerHtml += "</thead><tbody>";

            bodyLines.forEach(function (body: any, i: any) {
              const colors = tooltipModel.labelColors[i];
              let style = "background:" + colors.borderColor;
              style += "; border-color:" + colors.borderColor;
              style += "; border-width: 2px";
              style += "; margin-right: 5px";
              style += "; height: 10px";
              style += "; width: 10px";
              style += "; display: inline-block";
              style += "; border-radius: 50%";
              const span = '<span style="' + style + '"></span>';
              innerHtml += "<tr><td>" + span + body + "</td></tr>";
            });
            innerHtml += "</tbody>";

            let table = tooltipEl.querySelector("table");
            if (table) {
              table.innerHTML = innerHtml;
            }
          }

          const chart = context.chart;
          const position = chart.canvas.getBoundingClientRect();

          tooltipEl.style.opacity = "1";
          tooltipEl.style.position = "absolute";
          tooltipEl.style.fontFamily = tooltipModel.options.bodyFont.family;
          tooltipEl.style.fontSize = tooltipModel.options.bodyFont.size + "px";
          tooltipEl.style.fontStyle = tooltipModel.options.bodyFont.style;
          tooltipEl.style.padding =
            tooltipModel.padding + "px " + tooltipModel.padding + "px";
          tooltipEl.style.pointerEvents = "none";
          tooltipEl.style.backgroundColor = "rgba(51, 51, 51, 1)";
          tooltipEl.style.borderRadius = "5px";
          tooltipEl.style.color = "white";
          tooltipEl.style.maxWidth = "500px";
          tooltipEl.style.whiteSpace = "normal";
          tooltipEl.style.wordWrap = "break-word";
          tooltipEl.style.padding = "5px";

          let left = position.left + window.pageXOffset + tooltipModel.caretX;
          let top = position.top + window.pageYOffset - 70; // Fixed top position

          // Center the tooltip horizontally
          left -= tooltipEl.offsetWidth / 2;

          // Prevent the tooltip from going off the left side of the chart
          if (left < position.left + window.pageXOffset) {
            left = position.left + window.pageXOffset;
          }

          // Prevent the tooltip from going off the right side of the chart
          if (
            left + tooltipEl.offsetWidth >
            position.right + window.pageXOffset
          ) {
            left = position.right + window.pageXOffset - tooltipEl.offsetWidth;
          }

          tooltipEl.style.left = left + "px";
          tooltipEl.style.top = top + "px";
        },
        titleFont: {
          size: 16,
        },
        bodyFont: {
          size: 14,
        },
        callbacks: {
          label: function (context: any) {
            const city = context.dataset.label;
            const log = context.raw;

            if (!log) return "";

            if (dataType === "ping") {
              return `${city} | Пинг: ${context.parsed.y.toFixed(
                0
              )}мс | Потеря пакетов: ${log.packet_loss}%`;
            } else {
              const tooltipLines = [
                city,
                `Общее время: ${context.parsed.y.toFixed(0)}мс`,
                `Статус: ${log.status_code}`,
                `DNS: ${log.dns_time}мс`,
                `TCP: ${log.tcp_time}мс`,
                `TLS: ${log.tls_time}мс`,
                `Первый байт: ${log.first_byte_time}мс`,
                `Загрузка: ${log.download_time}мс`,
              ];
              return tooltipLines.join(" | ");
            }
          },
        },
      },
      crosshair: {
        enabled: true,
        line: {
          color: "#818181ff",
          width: 2,
          dashPattern: [6, 6],
        },
        snap: {
          enabled: true,
        },
        sync: {
          enabled: false,
        },
        zoom: {
          enabled: false,
        },
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
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
        type: "time" as const,
        time: {
          unit: "hour" as const,
          displayFormats: {
            hour: "HH:mm",
          },
          tooltipFormat: "PPP p",
        },
        adapters: {
          date: {
            locale: ru,
          },
        },
        grid: {
          display: false,
        },
        ticks: {
          color: "#d4d4d4",
          maxTicksLimit: getMaxTicksLimit(),
          source: "auto" as const,
        },
      },
    },
  };

  return <Line options={options} data={chartData} />;
};

export default CountryChart;
