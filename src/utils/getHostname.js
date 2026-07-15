const getHostname = (url) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
};

module.exports = getHostname;
