import http from 'http';
import { handler as computeRiskHandler } from './handlers/computeRisk.js';
import { handler as getRiskHandler } from './handlers/getRisk.js';
import { handler as getRouteHandler } from './handlers/getRoute.js';
import { handler as getUploadUrlHandler } from './handlers/getUploadUrl.js';
import { handler as postReportHandler } from './handlers/postReport.js';
import { handler as getHotspotsHandler } from './handlers/getHotspots.js';
import { handler as subscribeHandler } from './handlers/subscribe.js';

const PORT = process.env.PORT || 3001;

function createLambdaEvent(req: http.IncomingMessage, body: string, url: URL): any {
  const queryParams: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    queryParams[key] = val;
  });

  return {
    rawPath: url.pathname,
    rawQueryString: url.search.replace(/^\?/, ''),
    headers: req.headers,
    queryStringParameters: queryParams,
    pathParameters: {},
    body: body || undefined,
    requestContext: {
      http: {
        method: req.method || 'GET',
        path: url.pathname,
      },
    },
  };
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host || `localhost:${PORT}`;
  const parsedUrl = new URL(req.url || '/', `http://${host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method?.toUpperCase();

  // Read request body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf-8');

  const event = createLambdaEvent(req, body, parsedUrl);

  try {
    let result: any;

    if (pathname === '/risk' && method === 'GET') {
      result = await getRiskHandler(event);
    } else if (pathname.startsWith('/risk/') && method === 'GET') {
      const segmentId = pathname.replace('/risk/', '');
      event.pathParameters = { segmentId };
      result = await getRiskHandler(event);
    } else if (pathname === '/compute-risk' && method === 'POST') {
      result = await computeRiskHandler();
    } else if (pathname === '/route' && method === 'POST') {
      result = await getRouteHandler(event);
    } else if (pathname === '/reports/upload-url' && method === 'POST') {
      result = await getUploadUrlHandler(event);
    } else if (pathname === '/report' && method === 'POST') {
      result = await postReportHandler(event);
    } else if (pathname === '/hotspots' && method === 'GET') {
      result = await getHotspotsHandler(event);
    } else if (pathname === '/subscribe' && method === 'POST') {
      result = await subscribeHandler(event);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'NotFound', message: `Route ${method} ${pathname} not found` }));
      return;
    }

    res.writeHead(result.statusCode || 200, result.headers || { 'Content-Type': 'application/json' });
    res.end(result.body || '');
  } catch (err: any) {
    console.error('Unhandled server error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'InternalServerError', message: err.message }));
  }
});

// Run initial risk computation if running as standalone process
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, async () => {
    console.log(`Chennai Flood Pulse dev server running at http://localhost:${PORT}`);
    console.log('Triggering baseline risk recomputation...');
    try {
      await computeRiskHandler();
      console.log('Baseline risk computation ready.');
    } catch (e) {
      console.warn('Initial risk computation notice:', e);
    }
  });
}
