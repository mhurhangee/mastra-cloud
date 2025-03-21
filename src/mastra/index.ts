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
        
        // Add wildcard as fallback to ensure API endpoints are accessible
        const updatedAllowedDomains = [
          ...allowedDomains, 
          'http://localhost:4111',
          // Add Mastra Cloud domain if not already included
          'https://*.mastra.cloud',
        ];
        
        // Allow requests with no origin (like curl requests)
        if (!origin) {
          c.header('Access-Control-Allow-Origin', '*');
        } 
        // Check if the request origin is in our allowed list
        else if (updatedAllowedDomains.some(domain => {
          // Handle wildcard domains
          if (domain.includes('*')) {
            const pattern = domain.replace('*', '.*');
            return new RegExp(pattern).test(origin);
          }
          return domain === origin;
        })) {
          c.header('Access-Control-Allow-Origin', origin);
        }
        
        c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        c.header('Access-Control-Allow-Credentials', 'true');
        
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
        // Allow the /api endpoint (used for system status checks) to bypass authentication
        if (c.req.path === '/api' && c.req.method === 'GET') {
          await next();
          return;
        }
        
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
