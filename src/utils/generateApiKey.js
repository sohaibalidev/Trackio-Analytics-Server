const { nanoid } = require("nanoid");

const generateApiKey = () => {
  return `atk_${nanoid(32)}`;
};

module.exports = generateApiKey;
