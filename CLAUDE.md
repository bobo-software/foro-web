# Claude Rules

## Backend Request Implementation

foro-web talks to **foro-api** (first-party Node/Express/Drizzle service in the sibling `foro-api` repo) — not Skaftin. The Skaftin BaaS integration was migrated off in full; `skaftinClient`/`SKAFTIN_CONFIG` no longer exist.

Before implementing any backend request feature, always check:

1. The MCP tools (`mcp__foro-mysql__*`) for available server-side DB operations (schema introspection, migrations, bulk data loads) — these operate on foro-api's MySQL database directly.
2. The `client-sdk/requests/` docs for existing request patterns and API contracts.
3. Dira workspace `foro` (`search_docs` / `docs/api/api.md`) for the authoritative route/contract reference — update Dira when contracts change, not a git `docs/` tree.

Do not invent or assume request shapes — consult these sources first. If a feature needs an endpoint that doesn't exist yet on foro-api, it needs to be built there first (resource-oriented REST under `/api/v1`, see `foro-api/src/lib/crudRouter.ts` for the standard CRUD pattern), not proxied through some other mechanism.

## Form Inputs

Always use the shared form components from `src/components/forms/` for all user inputs. Never use raw `<input>`, `<select>`, or `<textarea>` elements directly in pages or modals.

| Need | Component |
|------|-----------|
| Text, number, date, email input | `AppLabledInput` (`AppLabledInput.tsx`) |
| Single-select dropdown | `AppLabeledSelectInput` (`AppLabledSelectInput.tsx`) |
| Searchable autocomplete | `AppLabledAutocomplete` (`AppLabledAutocomplete.tsx`) |
| Multi-line text | `AppLabeledAreaInput` (`AppLabledAreaInput.tsx`) |

## Documentation Updates

Update the matching note in the **Dira** workspace `foro` **as part of the same change** — not as a deferred follow-up. `search_docs` first; then `edit_file` / `write_file`. Do not recreate long-form notes under git `docs/`.

- `docs/web/00-overview/` — overall architecture or project scope
- `docs/web/01-roles/` — user roles or permissions
- `docs/web/02-modules/` — feature modules
- `docs/web/03-database/` — table/column contracts (then verify with MySQL MCP)
- `docs/api/api.md` / `docs/api/database.md` — HTTP or schema contracts

Keep Dira in sync with the code — do not leave notes stale.
