# DocChat — Chat with your documents

Upload a PDF and ask questions in plain language. DocChat answers **only** from your document's content and shows **citations** back to the source passages — a full Retrieval-Augmented Generation (RAG) pipeline built on Next.js, pgvector, Gemini embeddings, and Groq.

> Embed your documents → search them by meaning → get grounded, cited answers that refuse to hallucinate.

---

## Demo flow

1. **Upload** a PDF (drag & drop).
2. The app **extracts** its text, **chunks** it, **embeds** each chunk, and stores the vectors in Postgres.
3. **Ask** a question → the app embeds it, runs a vector similarity search for the most relevant chunks, and streams a grounded answer from the LLM with citations.
4. Ask something off-topic → it replies *"I couldn't find that in this document."* instead of making something up.

---

## Architecture — the RAG pipeline

```mermaid
flowchart TD
    subgraph Ingestion [Ingestion · on upload]
        A[PDF upload] --> B[Extract text<br/>unpdf]
        B --> C[Chunk text<br/>~800 tokens, 15% overlap]
        C --> D[Embed chunks<br/>Gemini gemini-embedding-001 · 768d]
        D --> E[(Neon Postgres<br/>pgvector)]
    end

    subgraph Query [Query · on each question]
        Q[User question] --> R[Embed question<br/>RETRIEVAL_QUERY]
        R --> S[Vector similarity search<br/>cosine distance &lt;=&gt; top-k]
        E --> S
        S --> T[Build grounded prompt<br/>context + rules]
        T --> U[Groq llama-3.3-70b<br/>stream answer]
        U --> V[Streamed answer + citations]
    end
```

**Key principle:** the model answers *from the retrieved context only* and admits when it doesn't know — this prevents hallucination.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database / vectors | Neon Postgres + `pgvector` |
| ORM | Prisma (raw SQL for vector ops) |
| Embeddings | Google Gemini `gemini-embedding-001` (768 dims) |
| LLM (answers) | Groq `llama-3.3-70b-versatile` (streamed) |
| PDF parsing | `unpdf` (server-side) |
| Hosting | Render (free tier) |

All third-party services used here have **free tiers** — no credit card required.

---

## Getting started

### 1. Prerequisites

- Node.js 18.18+ (20 or 22 recommended)
- A free [Neon](https://neon.tech) Postgres database
- A free [Google AI Studio](https://aistudio.google.com) API key (embeddings)
- A free [Groq](https://console.groq.com) API key (answers)

### 2. Install

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
# Neon — pooled connection (app) and direct connection (migrations)
DATABASE_URL="postgresql://USER:PASS@HOST-pooler/db?sslmode=require"
DIRECT_URL="postgresql://USER:PASS@HOST/db?sslmode=require"

# API keys
GOOGLE_API_KEY="..."   # Gemini embeddings
GROQ_API_KEY="..."     # Groq answers
```

### 4. Create the database schema

This enables the `pgvector` extension and creates the `Document` + `Chunk` tables:

```bash
npx prisma db push
```

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>, upload a PDF, and start asking questions.

### Handy scripts

```bash
npx tsx scripts/verify-db.ts          # check DB + pgvector + a similarity query
npx tsx scripts/verify-embeddings.ts  # check chunks are embedded (768 dims)
npx tsx scripts/reset-docs.ts         # delete all documents (clean slate)
```

---

## How it works (the interesting bits)

- **Chunking** (`src/lib/chunk.ts`): splits text into ~800-token windows with ~15% overlap on word boundaries, so a relevant passage never falls between two chunks.
- **Embeddings** (`src/lib/embeddings.ts`): plain REST calls to Gemini — no SDK to keep in sync. Documents are embedded as `RETRIEVAL_DOCUMENT`, questions as `RETRIEVAL_QUERY`, which improves match quality.
- **Vector search** (`src/lib/retrieval.ts`): pgvector's `<=>` cosine-distance operator via raw SQL (Prisma has no native vector type), returning the top-k chunks with similarity scores.
- **Grounded answers** (`src/lib/groq.ts`): a strict system prompt forces the model to use only the provided context and to refuse when the answer isn't there. Responses are **streamed** token-by-token using a native `ReadableStream` (no extra framework).

---

## Project structure

```
src/
  app/
    page.tsx                     # landing + upload + document list
    documents/[id]/page.tsx      # per-document chat page
    api/
      documents/route.ts         # POST upload+ingest, GET list
      documents/[id]/route.ts    # DELETE document
      chat/route.ts              # POST question → streamed grounded answer
  components/
    ingest-panel.tsx             # upload + document list (client)
    chat.tsx                     # streaming chat UI (client)
  lib/
    prisma.ts  pdf.ts  chunk.ts  embeddings.ts  retrieval.ts  groq.ts
prisma/schema.prisma             # Document + Chunk(vector(768)) models
scripts/                         # verification + reset helpers
```

---

## Design decisions

- **Why RAG, not fine-tuning?** Retrieval grounds answers in source text, is cheap, and updates instantly when documents change.
- **Preventing hallucination:** strict grounding prompt + explicit refusal path + citations the user can verify.
- **Chunking strategy:** overlap prevents context being cut mid-thought; size balances retrieval precision against context budget.
- **Vector search:** cosine distance over 768-dim embeddings in pgvector, with an option to add an HNSW index as data grows.
- **Streaming:** native `ReadableStream` over Server-Sent-Events from Groq — no SDK lock-in.
