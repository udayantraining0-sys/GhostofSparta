import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketHub } from './ws/wsHub';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'kratos-bff', version: '0.1.0' });
});

app.get('/api/status', (_req, res) => {
  res.json({
    active_connections: WebSocketHub.instance.getConnectionCount(),
    uptime: process.uptime(),
  });
});

const wsHub = new WebSocketHub(server);

server.listen(PORT, () => {
  console.log(`[KRATOS BFF] Listening on port ${PORT}`);
});

export { app, server, wsHub };
