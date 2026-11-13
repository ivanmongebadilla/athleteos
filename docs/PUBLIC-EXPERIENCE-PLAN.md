# Public experience and Spanish localization

1. Make `/` a public presentation page with a cinematic hero, a clear explanation of AthleteOS, honest early-access availability, and working account calls to action. Preserve the existing email-confirmation code forwarding.
2. Separate the public header/footer from the authenticated training shell. Only the server-verified athlete layout supplies identity to the private shell. Public pages have no athlete sidebar, mobile training tabs, or placeholder avatar.
3. Add typed English/Spanish dictionaries and an explicit language selector. Store a validated preference in a first-party cookie, render the document language on the server, and refresh server-rendered content when switching. Translate navigation, landing, authentication feedback, setup, existing module placeholders, profile, and error states. Do not translate user-entered data.
4. Preserve the existing Supabase authorization boundaries and URLs. No Phase 2 training features or AI endpoints are added. Use the current local Next.js checkout; no hosting changes.
5. Verify lint, strict types, unit tests, configured/unconfigured desktop and mobile browser flows, language persistence and auth callback boundaries. Inspect landing screenshots, then restore the real configured local preview.
