# DocChat — Product Requirements Document (PRD)

**Project type:** Portfolio project #2 (AI / RAG application)
**Goal:** Demonstrate LLM integration, embeddings, and vector search — the most in-demand skills in 2026 hiring — to complement FlowCRM (a CRUD SaaS).
**Target build time:** 1–2 weeks part-time

---

## 1. Overview

DocChat lets a user upload documents (PDFs) and then **chat with them** — ask questions in natural language and get answers grounded in the document content, with **citations** back to the source passages. It's a classic Retrieval-Augmented Generation (RAG) app.

This project proves a different skill set from FlowCRM: working with an LLM API, generating and storing embeddings, vector similarity search, and streaming AI responses.

## 2. Why this project (portfolio value)

- **"AI-integrated" is the hottest keyword in remote hiring right now.** A working RAG app is a strong, current signal.
- Differentiates from FlowCRM (business CRUD SaaS) by showing AI + data-retrieval skills.
- Reuses your existing stack (Next.js, TypeScript, Neon Postgres) — Neon supports `pgvector`, so no new database to learn.
- Visually impressive and easy to demo in 60 seconds.

## 3. Target users & use cases

Anyone who wants to query a long document without reading all of it: students with textbooks/papers, professionals with reports/contracts, support teams with manuals.

## 4. Core user flow

1. **Upload:** user uploads one or more PDFs.
2. **Ingest:** the app extracts text, splits it into chunks, generates embeddings, and stores them (with a visible processing state).
3. **Chat:** user asks a question → the app retrieves the most relevant chunks → sends them as context to the LLM → **streams** an answer back, with **citations** to the source chunks.
4. **Manage:** user sees their list of documents and can delete them.

## 5. Scope

### MVP (build and polish first)
- Upload a PDF (drag-and-drop), with a file-size limit.
- Server-side text extraction from the PDF.
- Chunk the text (~500–1,000 tokens, with overlap).
- Generate embeddings for each chunk via an embeddings API.
- Store chunks + embeddings in Postgres using `pgvector`.
- Chat UI: ask a question, get a **streamed** answer.
- **Retrieval:** embed the question, do a vector similarity search (top-k chunks), pass them to the LLM as grounding context.
- **Citations:** show which source passages the answer was based on.
- Document list with delete; empty/loading/error states.

### Stretch (only after MVP works)
- Support more file types (txt, docx, or paste a URL).
- User auth so documents are private per user (reuse the Auth.js pattern from FlowCRM).
- Persist conversation history.
- Highlight the exact source passage on click.
- A "Summarize this document" button.
- Streaming token-by-token typing effect, model picker.

### Out of scope (v1)
- Real-time collaboration, payments/billing, multi-tenant orgs.
- Fine-tuning models (we use retrieval, not training).

## 6. Functional requirements (user stories)

- As a user, I can upload a PDF and see its processing status until it's ready.
- As a user, I can ask a question and receive an answer grounded in my document, streamed as it generates.
- As a user, I can see citations/sources for each answer so I trust it.
- As a user, I can view and delete my uploaded documents.
- As a user, I'm told clearly when a document has no relevant content for my question (no hallucinated answers).

## 7. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| LLM (generation) | OpenAI (e.g. gpt-4o-mini) **or** Anthropic Claude — both have simple APIs |
| Embeddings | OpenAI `text-embedding-3-small` (cheap, standard) |
| Vector store | **Neon Postgres + `pgvector`** extension |
| ORM | Prisma (with a raw query or `pgvector` support for similarity search) |
| PDF parsing | `pdf-parse` (or `unpdf`) server-side |
| Streaming | Vercel AI SDK (`ai` package) or native ReadableStream/SSE |
| Hosting | Vercel or Render (free tier) |

> Tip: the **Vercel AI SDK** (`ai` + `@ai-sdk/openai`) dramatically simplifies streaming and is worth using. It works on Render too.

## 8. Architecture — the RAG pipeline

**Ingestion (on upload):**
1. Receive PDF → extract raw text.
2. Split text into overlapping chunks.
3. Call the embeddings API to turn each chunk into a vector.
4. Store `{ documentId, content, embedding, chunkIndex }` rows in Postgres.

**Query (on each question):**
1. Embed the user's question into a vector.
2. Run a **vector similarity search** (cosine distance) in Postgres to get the top-k most relevant chunks.
3. Build a prompt: a system instruction ("answer only from the context; if unknown, say so") + the retrieved chunks + the question.
4. Call the LLM and **stream** the response to the client.
5. Return the retrieved chunks as citations.

> Key principle: the model must answer **from the retrieved context only** and admit when it doesn't know — this prevents hallucination and is a strong talking point in interviews.

## 9. Data model

| Entity | Key fields |
|--------|-----------|
| **Document** | id, name, status (processing/ready/failed), createdAt, (userId — stretch) |
| **Chunk** | id, documentId, content (text), embedding (`vector`), chunkIndex |
| **Conversation** (stretch) | id, documentId, createdAt |
| **Message** (stretch) | id, conversationId, role (user/assistant), content, createdAt |

`pgvector` adds a `vector` column type and a similarity operator (`<=>` for cosine distance). Create an index (IVFFlat/HNSW) on the embedding column for fast search.

## 10. Key technical details to get right

- **Chunking:** ~500–1,000 tokens per chunk with ~10–15% overlap so context isn't cut mid-thought.
- **Top-k retrieval:** start with k=4–6 chunks; tune for answer quality.
- **Prompt grounding:** explicitly instruct the model to use only the provided context and to cite/refuse when unsure.
- **Streaming:** use the Vercel AI SDK's `streamText` or a ReadableStream so answers appear progressively.
- **Secrets:** the LLM API key lives only in server-side env vars, never the client.
- **Costs:** embeddings + small-model chat are cheap (cents for a demo); set a file-size/page limit to cap usage.

## 11. Build order (milestones)

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| 1 | Foundation | Next.js + Tailwind app, Neon DB with `pgvector` enabled, deploy a skeleton early |
| 2 | Ingestion | PDF upload → text extraction → chunking (log chunks to verify) |
| 3 | Embeddings + storage | Generate embeddings, store chunks + vectors in Postgres |
| 4 | Retrieval + answer | Vector search → prompt → LLM answer (non-streaming first) |
| 5 | Streaming + citations | Stream responses to the UI; show source passages |
| 6 | Polish + deploy | Document list/delete, empty/loading/error states, README + demo, deploy live |

> Same principle as FlowCRM: deploy a skeleton on day one, then layer features onto a working pipeline.

## 12. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Hallucinated answers | Strong grounding prompt; refuse when no relevant context |
| Large PDFs blow up cost/time | Page/size limit; chunk and embed in batches |
| Vector search setup friction | Use Neon's `pgvector`; test similarity query early |
| Streaming complexity | Use the Vercel AI SDK to handle it |

## 13. Packaging for impact

- Live demo with a sample document pre-loaded so reviewers can ask a question instantly.
- README: 1-line pitch, a GIF of asking a question and getting a cited answer, the architecture diagram (the RAG pipeline), and the hardest problems solved (chunking, retrieval quality, streaming).
- A short write-up: "How I built a RAG app with Next.js, pgvector, and the Vercel AI SDK" — turns the project into a second portfolio asset.
- Interview talking points: chunking strategy, why RAG vs. fine-tuning, how you prevent hallucination, vector similarity search.
