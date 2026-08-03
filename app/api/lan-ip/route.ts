import { networkInterfaces } from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name] || [];
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return Response.json({ ip: addr.address });
      }
    }
  }
  return Response.json({ ip: null });
}
