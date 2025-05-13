# LangChain Installation for Syntex

This document provides the exact commands to install LangChain libraries and set up the necessary dependencies.

## Installation Commands

Run these commands in your project root to install the required packages:

```bash
# Install core LangChain packages
npm install @langchain/openai @langchain/community 

# Install core packages and utilities
npm install @langchain/core pdf-parse

# Install Supabase for vector storage
npm install @supabase/supabase-js
```

## Environment Variables

Make sure you have these environment variables in your `.env.local` file:

```
# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Supabase settings
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Database Setup

1. Copy the SQL from `supabase-vector-setup.sql`
2. Go to the SQL Editor in your Supabase Dashboard
3. Paste the SQL and run it
4. This will:
   - Enable the pgvector extension
   - Add an embedding column to your documents table
   - Create the match_documents function
   - Set up proper indexes

## Import Paths

When working with LangChain, use these import paths:

```typescript
// PDF loading
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

// Core utilities
import { RecursiveCharacterTextSplitter } from "@langchain/core/text_splitter";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

// OpenAI integration
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";

// Vector storage
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
```

## Testing the Installation

To test if everything is set up correctly:

1. Run the server: `npm run dev`
2. Upload a PDF document
3. Check the console for extraction logs
4. Try searching for documents using the API

If you encounter any errors with imports, make sure you're using the correct import paths as shown above. 