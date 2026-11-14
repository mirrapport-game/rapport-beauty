<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Library solutions live in `cards` (type solution), RLS-readable only by leader/admin; players get them only through revealed `card_assignments`. `src/server/solutions.json` is legacy (solo practice).
- Live game state is the `game_sessions` row (stage, current player, timer); clients subscribe via realtime and compute the timer from `timer_started_at` + `timer_remaining`.
- Turn cards are `card_assignments` rows (situation/role revealed at once; skill/solution hidden until the leader reveals); content is read only via the `session_cards` RPC, which applies the same visibility rule. `get_turn_skill`/`solution_access` are legacy.
- Offline: vite-plugin-pwa generateSW at /sw.js, registered only via `src/lib/pwa.ts` (skips dev/preview hosts); card images use the `card-images` cache, which the "save to device" button prefills.
- Roles live in `user_roles` (player default; first user gets admin+leader); check with `has_role`. Only leaders/admins can create sessions (enforced in `create_game_session`).
- Card library (admin-managed): `categories`/`directions`/`cards`/`scenarios`/`batch_imports`; solution-type cards are RLS-readable only by leader/admin. Import validation lives in `src/lib/library.ts` (adds only, never overwrites). The live game deals from the DB; participant scenarios are copied into it by a trigger.
- Session results, skill_progress and achievements are computed by DB triggers when a session becomes finished (`finalize_session`, `award_achievements`); feedback scores are the 6-criteria `scores` jsonb. PDF exports are print-styled pages (window.print) to keep Cyrillic intact.
- Participant scenarios: `user_scenarios` (public fields) + `user_scenario_solutions` (author-only); game reads their solutions server-side via `get_user_solution` (service role only). AI structuring lives in `src/lib/scenarios.functions.ts`.
- Solo AI mode: `solo_sessions/messages/feedback`; all writes, bot replies and AI scoring go through `src/lib/solo.functions.ts` (service role after ownership check), so the solution is revealed only after finishing.
- Role of the day: `daily_*` tables; cards are issued by `issue_my_daily_card` RPC when the dashboard opens (idempotent per user-day) — no cron in this project; `daily_tasks.model_answer` is column-hidden and returned only after answering via `src/lib/daily.functions.ts`.
- Leader access by secret code: `redeemLeaderCode` in `src/lib/leader-code.functions.ts` compares against the LEADER_ACCESS_CODE secret server-side and grants leader+admin; entered only on the hidden /access page (footer dot); the code never ships to the browser.
- Clinics: `clinics` + `clinic_members` (one clinic per user, role member|manager); all changes go through security-definer RPCs (join_clinic, clinic_manage_member, admin_*), managers see stats via `clinic_stats`.
- Profiles store the chosen professional role (`prof_role`) and `play_scope` (own|all); signup passes them via user metadata into `handle_new_user`.
- EI tests (hall/emin/goleman): questions live in `src/data/assessments/*.json`, metadata+mapping in `assessment_tests`; results store common 6-scale `scores` plus `test_scores` and the `scale_mapping` used (mapping in `src/lib/ei-tests.ts`), so all history reads one scale set.
- Player-facing motivational copy (onboarding, dashboard cards, empty states, result screens, leader script) lives in `src/lib/copy.ts` as the single source; achievement titles/descriptions live in the `achievements` table. Add new motivation strings there instead of inline in components.
- Beauty edition: the 11 rubric card backs (рубашки) live as CDN assets mapped by rubric number in `src/lib/card-backs.ts`; situation cards show the back first and flip to text on tap. Base library content (rubrics, 18 «Мастер → Клиент» scenarios ×3 levels, skills, solutions) is seeded by `drizzle/migrations/0020_beauty_content.sql`; internal ids like `clinics`/`clinic_members` are kept from the source app for compatibility.
- Offline game: /offline is a public single-device mode; the deck is downloaded to localStorage (src/lib/offline-game.ts) while online and sessions/results stay on the device — why: no network means no realtime sync between phones.
