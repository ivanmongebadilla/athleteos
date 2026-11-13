# Session status and protected deletion

Today and Calendar share session cards with explicit Pending, In progress and Completed badges, plus a separate Draft/Published label. A session becomes In progress when any result exists, even while its stored status remains scheduled. Rest and cancelled sessions retain their own labels. Labels and controls support English and Spanish.

Delete is available on each eligible card and in the session header. Cards use a small trash icon at the top right on desktop and mobile, with a 44-pixel touch target, translated accessible label and tooltip. Completed sessions and any session with logged results have no Delete control. The card link and Delete button are separate controls, so deleting never opens the session accidentally. All delete entry points use the same confirmation modal, with the target title, initial Cancel focus, trapped Tab navigation, Escape/cancel, pending protection and retry guidance. Successful deletion returns to Today with Undo.

The restriction is enforced by migration `202611120007_protect_logged_sessions.sql`, applied to the hosted project after rollback-only validation. The authenticated delete RPC checks completed status and result existence while holding the same session lock used by log writers. This protects an older calendar or modal opened before another tab saves results. Ownership and expected-version checks still apply. Direct table updates remain unavailable.

Migration 007 replaces the earlier policy from 006 that allowed reversible deletion of logged sessions. It adds no tables or columns. Existing athlete sessions and history were not changed. Eligible deletion remains reversible: `deleted_at` hides the session from Today, Calendar and direct routes, while Undo restores the plan. Existing restore permissions and active-row writer guards are retained.

Before switching the manually managed hosted project to CLI migration management, reconcile migration `202611120007` along with the seven preceding versions listed in README.

Verification includes rollback-only hosted assertions for completed sessions, completed status without results, partial results, foreign ownership, stale versions, pending deletion/Undo, old editor/logger rejection, retained history and anonymous/direct-write denial. The existing core-training, section-logging and shared-catalog SQL suites also pass against the committed schema. No synthetic Auth fixtures remain.

Development-only browser checks cover Today, month/week Calendar, translated labels, per-card deletion, keyboard confirmation, cancel, failure/retry, Undo, protected session headers and logging after a modal opens. Tests use isolated HTTP fixtures. TypeScript, lint and unit tests are run separately. No production build is performed during this round of updates.

Final validation: 10 new desktop/mobile deletion/status workflows and all 20 existing editor/logging/catalog workflows passed, along with 29 unit tests and lint. All four hosted SQL suites passed, including the status-only and partially logged deletion guards. Read-only verification reports no temporary deletion accounts. Preview screenshots use synthetic sessions in `docs/screenshots/session-status-calendar-desktop.png` and `session-status-calendar-mobile.png`; hosted verification is saved as `supabase-session-protection-verified.png`.
