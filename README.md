# Dental practice & laboratories

Native local workspace for dental practices and dental labs, assembled from **3 source candidates**. It has **59 canonical feature pages**, shared client/work-item records, domain fields, search, exports, attachments, audit history and optional AI review drafts.

```sh
cd /Users/erolakarsu/external/projects/dental-platform
npm run build
./start.sh
```

Open http://localhost:46003. Node 22.13+ is required. No package installation or PostgreSQL database is needed. Startup clears only this selected port, tops up editable features to 15 fictional records and starts the app. Set `SEED_DEMO_DATA=0` to skip top-up. Configure your own OpenRouter key/model in `.env` to enable AI drafts; credentials are never imported from source projects.

Data is in `data/workspace.sqlite` and persists across builds and restarts. Source apps remain untouched in their original folders. The shared maintained source lives in `../_platform-builder/template`; the build creates this app's standalone `dist/` artifact.

See `FEATURE_STATUS.md` and the in-app Feature merge map for implementation boundaries. Source-backed calculation adapters are available only where explicitly registered; they use saved inputs and retain their original calculation scope. Other pages provide native records and drafts, not an automatic migration of every source engine.

```sh
npm test
npm run seed
```

This is a local single-user workspace. Original users/business databases, hosted authentication, multi-tenant permissions and external provider operations are not migrated. Do not treat a preparation record as a sent message, paid transaction, approved clinical decision or completed provider operation.


## Ask AI

AI feature pages now open a question-and-answer workspace. Enter your question, optionally add supporting fields or choose a saved record, and click **Ask AI**. Answers display with headings, lists and comparison tables where appropriate. Ask follow-up questions, reopen saved answers, copy the response or download it as Markdown. Non-AI record tables keep their existing popup actions.

Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in this app's `.env`, restart `./start.sh`, and refresh the browser. Missing configuration shows a setup message; no fabricated answer is substituted. Your question, supplied fields, selected record and conversation context go to the configured provider. Attachments are not automatically read. Saved answers remain in this app's SQLite database.

## Merged AI assistants

18 original AI entries are now grouped into **5 assistants** in the sidebar. Choose up to 8 related capabilities and add up to 10 questions for one provider request and one saved response. Shared context is sent once; repeated questions are removed after trimming and whitespace/case normalization. The total question limit is 5,000 words and the combined answer target is up to 5,000 words.

Original feature URLs still open the appropriate assistant with that capability selected. Existing records and answers stay in place; the assistant history includes answers saved under its member features. Non-AI record tables retain their popup actions. This merges the assistant workflow and navigation; it does not implement previously missing external integrations or specialist engines. See `reports/assistant-merge-map.json` and `reports/assistant-merge-verification.json`.

## Floating Ask AI assistant

Implemented across this workspace. The bottom-right **Ask AI** button opens a persistent chat panel on every page. Use **Ask AI about item** in a row popup or record view, or **Use current item** inside the panel, to supply the selected record.

- Questions about the page, any explicitly chosen app record, and general topics.
- Formatted answers, comparison tables, follow-ups, copy and Markdown download.
- Conversation and question drafts stay intact during in-app navigation. Saved answers persist in SQLite; the last conversation restores in the same browser tab after reload. The latest 50 saved answers are listed; restoring one displays up to 20 turns. Up to four preceding turns are sent as AI context.
- Up to 5,000 input words and a response budget of up to 5,000 words. Output length remains dependent on the provider and the question.
- Page title and description are supplied automatically; record fields and notes are sent only for a selected item. Attachments and unselected records are not included. **New chat** starts without earlier conversation context.
- Existing AI provider configuration, timeout, rate limit and safe response renderer are reused. The assistant answers and drafts; it does not execute record changes or external actions.

Validation: shared backend tests, all 64 app builds/API checks, and all 64 browser checks passed with an injected test provider. Browser checks cover item context, navigation, saved history/reload, follow-ups, new-chat isolation, error recovery, word limits, keyboard controls, mobile bounds, safe Markdown rendering and attachment refresh. See [verification](reports/floating-ai-verification.json).

## Clone and run

Clone the shared builder alongside this app (once for all platform apps):

```sh
gh repo clone eakarsu/_platform-builder
gh repo clone eakarsu/dental-platform
cd dental-platform
cp .env.example .env
npm run build
./start.sh
```

Use Node.js 22.13 or newer. Put your AI provider key and model in your local `.env`. Credentials and workspace databases are excluded from Git. Calculator sources needed by this app are included in `engines/` when applicable.
