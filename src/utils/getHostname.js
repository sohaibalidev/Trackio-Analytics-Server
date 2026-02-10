const getHostname = (origin) => {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
};

module.exports = getHostname;
