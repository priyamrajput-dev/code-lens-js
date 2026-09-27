# Code Lens JS — MERN + MVC Edition

AI-powered code review platform built with the MERN stack, MVC architecture, and MongoDB Atlas Vector Search.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS, Shadcn UI |
| Backend | Express 5, MVC, Zod |
| Database | MongoDB Atlas, Mongoose |
| Vector Search | MongoDB Atlas Vector Search |
| AI | Google Gemini / OpenRouter |
| Auth | Better Auth + GitHub OAuth |
| Runtime | Bun |

## Setup

```bash
# Server
cd server && bun install && bun run dev

# Client
cd client && bun install && bun run dev
```

## Architecture

```
React → Express Routes → Controllers → Services → Repositories → Mongoose Models → MongoDB
```
