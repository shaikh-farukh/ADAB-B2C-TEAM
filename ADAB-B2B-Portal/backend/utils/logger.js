const logger = {
  info: (message, meta) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message, meta) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message, error, meta) => {
    const timestamp = new Date().toISOString();
    const errorDetails = (error && error.message) ? `${error.message}\nStack: ${error.stack || 'No stack'}` : JSON.stringify(error);
    const logStr = `[${timestamp}] [ERROR] ${message} - Details: ${errorDetails} ${meta ? JSON.stringify(meta) : ''}`;
    console.error(logStr);
  },
  debug: (message, meta) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

export default logger;
