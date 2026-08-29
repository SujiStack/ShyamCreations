# Project Agent — Shyam Creations

## Purpose

This document describes the project-local agent guidelines and capabilities for the Shyam Creations repository. It helps contributors and tools (including automated assistants) understand the project's structure, common tasks, and useful commands.

## Quick Commands

- Start dev server: `pnpm exec vite`
- Install dependencies: `pnpm install`
- Build for production: `pnpm run build`

## Project Layout (high level)

- `src/` — main TypeScript React source; entry points: `main.tsx`, `App.tsx`, views in `views/`.
- `src/components/` — UI components (navigation, drawers, modals, footer).
- `src/lib/` — project utilities and integrations (`supabase.ts`, `razorpay.ts`, `emailService.ts`).
- `supabase/` — serverless functions and webhooks used with Supabase.
- `assets/` and `data/mockData.ts` — static assets and local mock data.
- `package.json`, `tsconfig.json`, `vite.config.ts` — project config and scripts.

## Agent Capabilities

The local agent can:
- Help add or modify React components and views.
- Create or update Supabase function stubs in `supabase/`.
- Draft or update documentation files like `README.md` or this `agent.md`.
- Suggest and add small, focused patches; run quick verification steps when requested.
- Produce commands and workflows for building, running, and debugging.

## Conventions & Notes

- Use TypeScript types defined in `src/types.ts` for props and data shapes.
- Follow existing code style in `src/` and keep edits minimal and focused.
- When adding features that require new scripts or dependencies, update `package.json` with a matching npm script.

## What the Agent Should Not Do

- Make large, architectural changes without explicit review.
- Add secrets, keys, or credentials to the repository.
- Change unrelated files or refactor broadly unless asked.

## On-boarding checks for changes

1. Run the dev server: `pnpm exec vite` and ensure the main view loads.
2. If modifying Supabase functions, ensure local tests (where available) pass and payload shapes align with `src/types.ts`.
3. Add brief notes to `README.md` for any new project-level commands or setup steps.

## Contact / Owner

If unsure about a change or its scope, ask the repository owner or open an issue for discussion before making large changes.

---

Generated and maintained by the project agent. Update this file if project structure or workflows change.
