const morgan = require('morgan');

// Custom Morgan token for request body if needed or standard format
const requestLogger = morgan(':method :url :status :res[content-length] - :response-time ms');

module.exports = requestLogger;
