function formatDailyData(dailyData) {
  const now = new Date();
  const chartData = [];

  for (let i = 29; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);

    const dayStr = day.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });

    const matchingDay = dailyData.find((d) => {
      const dataDate = new Date(d._id.date);
      dataDate.setHours(0, 0, 0, 0);

      return dataDate.getTime() === day.getTime();
    });

    chartData.push({
      time: dayStr,
      visitors: matchingDay ? matchingDay.visitors.length : 0,
      pageviews: matchingDay ? matchingDay.pageviews : 0,
    });
  }

  return chartData;
}

function generateEmptyChartData() {
  const chartData = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now);
    hour.setHours(hour.getHours() - i);

    const hourStr = hour
      .toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .slice(0, 5);

    chartData.push({
      time: hourStr,
      visitors: 0,
      pageviews: 0,
    });
  }

  return chartData;
}

module.exports = { formatDailyData, generateEmptyChartData };
