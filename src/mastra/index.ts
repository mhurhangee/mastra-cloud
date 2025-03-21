import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { weatherWorkflow, markdownChunkWorkflow } from './workflows';
import { weatherAgent } from './agents';

// Define the allowed domains for CORS
const allowedDomains = process.env.MASTRA_ALLOWED_DOMAINS?.split(',') || [];

export const mastra = new Mastra({
  workflows: { weatherWorkflow, markdownChunkWorkflow },
  agents: { weatherAgent },
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
  serverMiddleware: [
    // CORS middleware (should come before authentication)
    {
      handler: async (c, next) => {
        const origin = c.req.header('Origin');
        
        // Check if the request origin is in our allowed list
        if (origin && allowedDomains.includes(origin)) {
          c.header('Access-Control-Allow-Origin', origin);
          c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          c.header('Access-Control-Allow-Credentials', 'true');
        }
        
        // Handle preflight requests (OPTIONS)
        if (c.req.method === 'OPTIONS') {
          return new Response(null, { status: 204 });
        }
        
        await next();
      },
    },
    // Authentication middleware
    {
      handler: async (c, next) => {
        if (process.env.NODE_ENV === 'development') {
          await next();
          return;
        }
        
        const authHeader = c.req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response('Unauthorized: Missing or invalid API key', { status: 401 });
        }
        
        const apiKey = authHeader.split(' ')[1];
        
        if (apiKey !== process.env.MASTRA_API_KEY) {
          return new Response('Unauthorized: Invalid API key', { status: 401 });
        }
        
        await next();
      },
      path: '/api/*',
    },
  ],
});
