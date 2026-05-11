import { WebSocket, WebSocketServer } from 'ws';
import * as http from 'http';
import { randomUUID } from 'crypto';

type WsMessage = {
  channel?: string;
  event?: string;
  type?: string;
  data?: unknown;
};

type Client = {
  ws: WebSocket;
  id: string;
  userId?: string;
  channels: Set<string>;
  connectedAt: number;
};

export class WebSocketHub {
  static instance: WebSocketHub;
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client> = new Map();
  private channelSubscriptions: Map<string, Set<WebSocket>> = new Map();

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupHandlers();
    WebSocketHub.instance = this;
    console.log('[WS Hub] Initialized on /ws');
  }

  private setupHandlers() {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const clientId = randomUUID();
      const client: Client = {
        ws,
        id: clientId,
        channels: new Set(),
        connectedAt: Date.now(),
      };

      this.clients.set(ws, client);
      console.log(`[WS] Client connected: ${clientId} (total: ${this.clients.size})`);

      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
      }));

      ws.on('message', (raw: Buffer) => {
        try {
          const msg: WsMessage = JSON.parse(raw.toString());
          this.handleMessage(client, msg);
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        for (const [, subs] of this.channelSubscriptions) {
          subs.delete(ws);
        }
        console.log(`[WS] Client disconnected: ${clientId} (total: ${this.clients.size})`);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Client error ${clientId}:`, err.message);
      });
    });
  }

  private handleMessage(client: Client, msg: WsMessage) {
    switch (msg.type) {
      case 'subscribe':
        if (msg.channel) {
          client.channels.add(msg.channel);
          if (!this.channelSubscriptions.has(msg.channel)) {
            this.channelSubscriptions.set(msg.channel, new Set());
          }
          this.channelSubscriptions.get(msg.channel)!.add(client.ws);
          client.ws.send(JSON.stringify({
            type: 'subscribed',
            channel: msg.channel,
          }));
        }
        break;

      case 'unsubscribe':
        if (msg.channel) {
          client.channels.delete(msg.channel);
          const subs = this.channelSubscriptions.get(msg.channel);
          if (subs) {
            subs.delete(client.ws);
          }
        }
        break;

      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      default:
        this.broadcastToChannel(msg.channel || 'global', {
          type: msg.type,
          event: msg.event,
          data: msg.data,
          senderId: client.id,
        });
    }
  }

  broadcastToChannel(channel: string, data: unknown) {
    const subs = this.channelSubscriptions.get(channel);
    if (!subs) return;

    const payload = JSON.stringify(data);
    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  broadcastToAll(data: unknown) {
    const payload = JSON.stringify(data);
    for (const [, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  getConnectionCount(): number {
    return this.clients.size;
  }
}
