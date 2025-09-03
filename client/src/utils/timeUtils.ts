export const formatTime = (time: string, timeRange: string) => {
  const date = new Date(time);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  switch (timeRange) {
    case "day":
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
    case "4hours":
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
    case "hour":
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
    case "30minutes":
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
    default:
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
  }
  return date.toLocaleTimeString([], options);
};

export const getLabels = (logs: any[], timeRange: string) => {
  const allLogs = Object.values(logs).flat();
  const labels = [
    ...new Set(
      allLogs.map((log: any) => formatTime(log.created_at, timeRange))
    ),
  ].sort();

  return labels;
};
