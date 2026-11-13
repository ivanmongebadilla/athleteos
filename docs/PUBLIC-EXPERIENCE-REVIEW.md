# Public presentation and Spanish support — November 12, 2026

## Changes

- `/` now presents AthleteOS publicly with original sports imagery, a responsive hero, an explanation of the approach and disciplines, transparent current/roadmap availability, FAQ disclosures and working account links.
- Public login, setup and error pages use a header/footer without the private sidebar, mobile training navigation or athlete avatar. Only the verified athlete layout supplies identity to the private shell. Authenticated avatars derive from the account instead of a hardcoded letter.
- English/Spanish selection persists for one year in a validated first-party cookie. Server-rendered content, document language/metadata, forms, auth feedback, profile, navigation and current placeholders/error states are localized. User data is not translated.
- Existing callback destinations now use relative redirects. Browser testing uncovered that constructing absolute redirects from the internal request URL changed `127.0.0.1` to `localhost`, dropping host-scoped locale cookies and potentially session cookies. The new redirect behavior preserves the browser origin and still ignores caller-supplied `next` destinations.
- No database changes, AI endpoints, training features, billing or deployment were introduced.

## Verification

- ESLint passed.
- Strict TypeScript passed, including production build checking.
- 11 unit tests passed, covering authentication inputs and supported/unsupported locale values.
- 12 unconfigured desktop/mobile browser checks passed, including protected-route and auth callback boundaries.
- 8 configured desktop/mobile browser checks passed, including public navigation, absent signed-out avatars/sidebar, landing links, responsive overflow and language persistence through navigation, reload and confirmation errors.
- Desktop English and mobile Spanish presentation screenshots were visually inspected. Live language switching was also verified in the in-app browser.

The image was generated with the built-in ImageGen tool. Its saved location and exact prompt are documented in `docs/HERO-ASSET.md`. Physical iPhone Safari and a real account's full signup/email/login journey were not exercised as part of this UI update. Existing Supabase auth and RLS boundaries remain in place.
