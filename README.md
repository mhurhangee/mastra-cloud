# Mastra API Client Documentation
This README explains how to use the Mastra Client SDK to interact with your deployed Mastra workflows, specifically the markdown chunker workflow.

##Setup
First, create a client module that handles authentication and configures the API connection:
`@/lib/mastra/client.ts`

```ts
import { MastraClient } from "@mastra/client-js";

// Initialize Mastra client with your configuration - only used server-side
export const getMastraClient = () => {
  const apiKey = process.env.MASTRA_API_KEY;
  const baseUrl = process.env.MASTRA_API_URL;

  if (!apiKey) {
    throw new Error('Missing Mastra API key in server environment');
  }

  if (!baseUrl) {
    throw new Error('Missing Mastra API URL in server environment');
  }

  return new MastraClient({
    baseUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    retries: 3,
    backoffMs: 300,
    maxBackoffMs: 5000,
  });
};

// Type definitions for the markdown chunk workflow
export interface ChunkOptions {
  strategy?: 'recursive' | 'character' | 'token' | 'markdown' | 'html' | 'json' | 'latex';
  size?: number;
  overlap?: number;
  separator?: string;
  isSeparatorRegex?: boolean;
  keepSeparator?: 'start' | 'end';
}

export interface ChunkResult {
  chunks: Array<{
    text: string;
    metadata?: Record<string, any>;
  }>;
  totalChunks: number;
}

// Export an easier-to-use API for the markdown chunker
export const markdownChunker = {
  /**
   * Chunks markdown text into smaller segments
   * @param markdownText - The markdown content to chunk
   * @param chunkOptions - Optional chunking configuration
   */
  chunk: async (markdownText: string, chunkOptions?: ChunkOptions): Promise<ChunkResult> => {
    const workflow = getMastraClient().getWorkflow('markdown-chunk');
    
    const result = await workflow.run({
      markdownText,
      chunkOptions,
    });
    
    return result as ChunkResult;
  }
};
```

## API Route (Next.js): pages/api/chunk-markdown.ts

```ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getMastraClient, ChunkOptions, ChunkResult } from '@/lib/mastra/server-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { markdownText, chunkOptions } = req.body;

    if (!markdownText || typeof markdownText !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid markdownText' });
    }

    // Get the Mastra client
    const mastraClient = getMastraClient();
    
    // Get the workflow
    const workflow = mastraClient.getWorkflow('markdown-chunk');
    
    // Run the workflow
    const result = await workflow.run({
      markdownText,
      chunkOptions,
    });
    
    // Return the result
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error chunking markdown:', error);
    return res.status(500).json({ 
      error: 'Failed to chunk markdown',
      message: error.message 
    });
  }
}
```
