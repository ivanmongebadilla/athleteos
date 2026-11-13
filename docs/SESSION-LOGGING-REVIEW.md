# Session-linked logging redesign

Reference: the user-provided one-page “Log de entrenamiento — Desktop.pdf”, rendered and visually inspected. The page follows the mockup's session/plan column, planned-versus-actual set rows, independent block saves, and format-specific WOD inputs, using the existing AthleteOS shell and theme.

## Workflow

Open a session from Today or Calendar, or save a published session from the creator. `/sessions/[id]` is the logging page for that exact owned session. Draft/rest/cancelled sessions show their plan without logging forms. Session title, local training date, prescription, instructions, cap, movement details and block order come from the saved session.

Each block saves independently and displays saved/unsaved status and a server timestamp. Other blocks' unfinished entries remain in place while a block saves. Strength presents prescribed sets next to actual reps/load/unit; actual values start empty. Additional sets and optional RPE/rest/success/notes remain available. Warm-up or instructions-only blocks can be explicitly marked completed. No planned weights or reps are silently written as actual performance.

WOD input adapts to the saved format: For Time uses MM:SS and an optional did-not-finish flag; AMRAP uses completed rounds plus extra reps; EMOM uses per-minute checkboxes derived from the planned cap when present; intervals/Tabata use a configurable interval checklist; custom supports elapsed time and optional score details. RX/scaled, notes, RPE and optional additional metrics are retained. Interval checklists persist as structured values.

A session becomes completed after every block has a saved result. The first saved block freezes prescription editing. Updating a block appends a new result revision with new completed-set rows; old results and prescriptions remain intact and previous entries are accessible. PR history is not inferred or modified. Publication and ownership checks remain server-side and in PostgreSQL.

## Persistence

Migration `202611120003_section_logging.sql` adds `workout_results.score_details` (bounded, validated interval/DNF data) and `save_workout_section(jsonb)`. There are still 17 tables with RLS, now 167 application columns. The RPC derives ownership from `auth.uid()`, fixes its search path, locks the session, checks published status, session/section membership, prescribed exercise membership, result versions and score structure, then atomically appends a result and its sets. Completion is updated in the same transaction. Anonymous execution and direct history mutation remain denied. No service-role key is used.

The expected latest result ID prevents duplicate/stale saves or lost corrections. Session versions prevent saving against an edited prescription; completed sessions can accept revisions because their prescriptions are frozen. Result timestamps use database wall-clock time to order rapid revisions. Existing one-shot results remain readable; the original atomic logging function remains for compatibility.

This migration was applied to the existing hosted AthleteOS project via SQL Editor after a rollback-only test. Reconcile migration version `202611120003` along with the earlier applied versions before switching that project to CLI migration management.

## Verification and limits

- Development-only Playwright checks use the isolated local contract fixture, covering desktop/mobile independent saves, unfinished-input retention, completion, immutable planned values, correction history, reload persistence, Spanish AMRAP and EMOM checklists. These checks do not use real athlete data or prove hosted authentication.
- `supabase/tests/section_logging.sql` exercises the actual hosted database with temporary accounts and rolls everything back. It covers partial completion, stale duplicate denial, frozen plan editing, append-only revisions, cross-athlete denial, atomic rollback for a movement outside its section, structured interval validation/persistence, completion, anonymous denial and direct-update denial.
- Existing core SQL checks are rerun against the migration. `verify_core_training.sql` checks table/column/function counts, private helper grants and absence of fixtures. Unit tests cover time parsing and structured-score validation. Lint and strict TypeScript run without production builds.
- Result history is append-only; PR correction/export/retention workflows remain later release work. Interval checklists support up to 1,440 entries and actual sets up to 200 per block. Percentage prescriptions display the saved percentage without inventing a calculated weight. Unchecked saved intervals represent missed intervals. No sample data is retained in the hosted database.

Production builds remain deferred during the user's current round of changes.
