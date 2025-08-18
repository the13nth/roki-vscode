import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Increase timeout for API routes to handle long-running AI analysis
  serverExternalPackages: ['@pinecone-database/pinecone'],
  
  // Configure API routes timeout
  async headers() {
    return [
      {
        source: '/api/projects/:id/analyze',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
