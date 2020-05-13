const { SEMATEXT_HOSTS } = require("./constants");

module.exports = hostname => {
  for (const [region, h] of Object.entries(SEMATEXT_HOSTS)) {
    if (hostname.endsWith(h)) {
      return region;
    }
  }
};
