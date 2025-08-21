# Pinecone Setup for AI Project Manager

This guide will help you set up Pinecone for vector storage and similarity search of your AI Project Manager projects.

## Prerequisites

1. A Pinecone account (free tier available at [pinecone.io](https://pinecone.io))
2. Node.js and npm installed
3. The AI Project Manager web dashboard running locally

## Step 1: Create a Pinecone Account

1. Go to [pinecone.io](https://pinecone.io) and sign up/login
2. Complete the account setup process
3. Navigate to your Pinecone dashboard

## Step 2: Create a Pinecone Index

1. In your Pinecone dashboard, click "Create Index"
2. Configure your index:
   - **Index Name**: `roki` (or your preferred name)
   - **Dimensions**: `1024` (for document embeddings)
   - **Metric**: `cosine` (recommended for text similarity)
   - **Cloud**: Choose your preferred cloud provider (AWS, GCP, Azure)
   - **Region**: Select the region closest to you
   - **Pod Type**: `p1.x1` (free tier) or higher for production
3. Click "Create Index"
4. Wait for the index to be created (this may take a few minutes)

## Step 3: Get Your API Keys

1. In your Pinecone dashboard, go to **API Keys**
2. Copy your **API Key** (starts with a long string of characters)
3. Note your **Environment** (e.g., `gcp-starter`, `us-east-1-aws`)

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in your web dashboard root directory (if it doesn't exist)
2. Add the following environment variables:

```env
NEXT_PUBLIC_PINECONE_API_KEY=your-api-key-here
NEXT_PUBLIC_PINECONE_INDEX_NAME=your_index_name
```

Replace the values with your actual Pinecone API key and index name.

## Step 5: Test the Connection

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to any project in your dashboard
3. Look for the "Online Sync" card in the sidebar
4. It should show "Connected" if everything is set up correctly

## Step 6: Configure Embedding Model (Optional)

For production use, you'll want to use a proper embedding model:

1. **OpenAI Embeddings**: Use `text-embedding-ada-002` (1536 dimensions)
2. **Hugging Face**: Use models like `sentence-transformers/all-MiniLM-L6-v2`
3. **Custom Models**: Train your own embeddings for domain-specific content

Update the `generateEmbedding` function in `src/lib/pinecone.ts` to use your preferred model.

## Features

Once set up, you'll have access to:

### 🔍 **Vector Search**
- Semantic search across project documents
- Similarity-based context retrieval
- Intelligent document recommendations

### 📊 **Project Synchronization**
- Vector-based project storage
- Metadata preservation with embeddings
- Conflict detection and resolution

### 🧠 **AI-Powered Features**
- Smart context selection for AI injection
- Similar document recommendations
- Content-based project organization

### 🔄 **Real-time Sync**
- Vector-based change detection
- Efficient similarity comparisons
- Scalable document storage

## Vector Dimensions

The system uses different vector dimensions for different content types:

- **Project Metadata**: 384 dimensions
- **Document Content**: 1024 dimensions
- **Context Documents**: 1024 dimensions
- **Task Embeddings**: 512 dimensions

## Namespace Organization

Data is organized in Pinecone using namespaces:

- `projects` - Project metadata and sync status
- `documents` - Requirements, design, and tasks documents
- `context` - Context files for AI injection
- `tasks` - Individual task embeddings
- `sync_logs` - Sync activity tracking

## Troubleshooting

### "No internet connection" error
- Check your Pinecone API key
- Ensure your environment variables are set correctly
- Verify your internet connection
- Check if your Pinecone index is active

### "Index not found" error
- Verify your index name matches the environment variable
- Ensure the index is created and active
- Check your Pinecone dashboard for index status

### "Dimension mismatch" error
- Ensure your embedding model matches the index dimensions
- Update the `VECTOR_DIMENSIONS` constants if needed
- Recreate the index with correct dimensions if necessary

### Performance issues
- Consider upgrading to a paid Pinecone plan
- Optimize your embedding model
- Use appropriate pod types for your workload

## Advanced Configuration

### Custom Embedding Models

To use a custom embedding model:

1. Install the required packages:
   ```bash
   npm install openai @huggingface/inference
   ```

2. Update the `generateEmbedding` function:
   ```typescript
   import OpenAI from 'openai';
   
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   });
   
   export async function generateEmbedding(text: string, dimension: number): Promise<number[]> {
     const response = await openai.embeddings.create({
       model: 'text-embedding-ada-002',
       input: text,
     });
     
     return response.data[0].embedding;
   }
   ```

### Batch Operations

For better performance with large datasets:

```typescript
// Batch upsert for multiple documents
const vectors = documents.map(doc => ({
  id: createVectorId(NAMESPACES.DOCUMENTS, doc.id),
  values: await generateEmbedding(doc.content, VECTOR_DIMENSIONS.DOCUMENT_CONTENT),
  metadata: doc.metadata
}));

await index.upsert(vectors);
```

### Filtering and Metadata

Use Pinecone's filtering capabilities:

```typescript
// Search with complex filters
const results = await index.query({
  vector: embedding,
  filter: {
    projectId: { $eq: projectId },
    type: { $in: ['requirements', 'design'] },
    syncStatus: { $eq: 'synced' }
  },
  topK: 10,
  includeMetadata: true
});
```

## Next Steps

1. **Production Deployment**: Set up proper embedding models
2. **User Authentication**: Implement user-specific vector storage
3. **Advanced Search**: Add semantic search UI components
4. **Performance Optimization**: Implement caching and batch operations
5. **Analytics**: Add vector search analytics and insights

## Support

If you encounter issues:
1. Check the Pinecone dashboard for index status
2. Verify your environment variables
3. Test your API key with a simple curl request
4. Check the browser console for error messages
5. Review Pinecone's documentation at [docs.pinecone.io](https://docs.pinecone.io)
