import dotenv from "dotenv";
dotenv.config();

import http from "http";

process.on('exit', (code) => {
    console.log(`[DEBUG] Process exiting with code: ${code}`);
});
process.on('beforeExit', (code) => {
    console.log(`[DEBUG] Process beforeExit with code: ${code}`);
});

import app from "./app.js";
import { initSocket } from "./Config/socket.js";
import "./Config/redis.js";
import connectRabbitMQ from "./Config/rabbitmq.js";

import { startEmailWorker } from "./workers/emailWorker.js";
import { startOrderWorker } from "./workers/orderWorker.js";
import "./cron/creditAgingJob.js";
import "./cron/auditLogCleanup.js";
import { startCreditAgingJob } from "./cron/creditAgingJob.js";

const port = process.env.PORT || 8000;
const server = http.createServer(app);

// Initialize Socket.io on the existing B2B HTTP server
initSocket(server);

// Initialize RabbitMQ and then start workers
connectRabbitMQ().then(() => {
    startEmailWorker();
    startOrderWorker();
}).catch((err) => {
    console.log('RabbitMQ connect warning (optional):', err.message);
});

server.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    // Start automated background jobs
    startCreditAgingJob();
});

// Force event loop to stay alive
setInterval(() => {
    console.log('[DEBUG] Heartbeat... Event loop is alive.');
}, 20000);