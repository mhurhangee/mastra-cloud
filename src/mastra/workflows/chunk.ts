import { Step, Workflow } from '@mastra/core/workflows';
import { MDocument } from '@mastra/rag';
import { z } from 'zod';

// Define a schema for chunking options
const chunkOptionsSchema = z.object({
  strategy: z.enum(['recursive', 'character', 'token', 'markdown', 'html', 'json', 'latex']).optional()
    .describe('The chunking strategy to use. Defaults based on document type.'),
  size: z.number().default(512)
    .describe('Maximum size of each chunk'),
  overlap: z.number().default(50)
    .describe('Number of characters/tokens that overlap between chunks'),
  separator: z.string().default('\n\n')
    .describe('Character(s) to split on. Defaults to double newline for text content'),
  isSeparatorRegex: z.boolean().default(false)
    .describe('Whether the separator is a regex pattern'),
  keepSeparator: z.enum(['start', 'end']).optional()
    .describe('Whether to keep the separator at the start or end of chunks'),
});

const chunkInputSchema = z.object({
  markdownText: z.string().describe('The markdown text to be chunked'),
  chunkOptions: chunkOptionsSchema.optional().describe('Options for chunking the document'),
});

// Define the Step to process markdown text into chunks
const chunkMarkdown = new Step({
  id: 'chunk-markdown',
  description: 'Converts markdown text into chunks using Mastra MDocument',
  inputSchema: chunkInputSchema,
  execute: async ({ context }) => {
    const triggerData = context?.getStepResult<z.infer<typeof chunkInputSchema>>('trigger');

    if (!triggerData) {
      throw new Error('Trigger data not found');
    }

    const { markdownText, chunkOptions = {} } = triggerData;

    // Create MDocument from markdown text
    const doc = MDocument.fromMarkdown(markdownText);
    
    // Process document into chunks using the provided options
    const chunks = await doc.chunk(chunkOptions);
    
    // Return the chunks and metadata
    return {
      chunks,
      totalChunks: chunks.length,
    };
  },
});

// Create the workflow
const markdownChunkWorkflow = new Workflow({
  name: 'markdown-chunk',
  triggerSchema: chunkInputSchema,
}).step(chunkMarkdown);

// Commit the workflow
markdownChunkWorkflow.commit();

export { markdownChunkWorkflow };
