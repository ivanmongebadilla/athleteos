# Shared English/Spanish exercise catalog

The hosted AthleteOS database now contains 1,379 shared exercises: all 1,324 records from the pinned dataset and 55 missing core movements. Existing private exercises, prescribed movements, PRs and results keep their IDs. Existing custom exercises are not automatically merged into similarly named catalog entries.

## Research and coverage

The comparison covers 79 deliberately selected foundational movements, common CrossFit movements, Olympic lifts and training variations. Twenty-four have explicit existing equivalents; 55 are additions. The complete mappings and additions are in `data/exercises/core-movements.tsv` and `coverage.json`. This is a practical starting catalog, not a claim to cover every competition variant.

Primary references:

- [CrossFit's movement library](https://www.crossfit.com/crossfit-movements): foundational movement groups, common barbell lifts, gymnastics and conditioning movements.
- [IWF 2026 Technical and Competition Rules](https://iwf.sport/wp-content/uploads/downloads/2026/10/IWF-TCRR-2026.pdf), section 2: Snatch and Clean & Jerk competition identities.
- Catalyst Athletics' first-party coaching library: [Tall Snatch](https://www.catalystathletics.com/exercise/217/Tall-Snatch/), [Tall Clean](https://www.catalystathletics.com/exercise/150/Tall-Clean/), [Jerk Drive](https://www.catalystathletics.com/exercise/413/Jerk-Drive/), and [Jerk dip mechanics](https://catalystathletics.com/video/1374/How-To-Dip-Correctly-In-The-Jerk/).
- [CrossFit workout 260325](https://www.crossfit.com/260325): GHD sit-ups and hollow rocks.

Additions include the standard Snatch/Clean & Jerk, hang/power/muscle variants, jerk/press variants and drills, Double-unders, Wall-ball Shots, box jumps, toes-to-bar variants, bar/ring muscle-up variants, handstand work, rowing and core work. Variation names retain separate identities rather than merging different movement standards.

## Data provenance and language

Source: [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), revision `7455efae41b330c265e7cd4b78dfa848e7ce5ebd`. `data/exercises/provenance.json` records the source. The MIT copyright/license notice is retained in `data/exercises/LICENSE.txt`. Only text/metadata is imported. No Gym visual images or GIFs are downloaded, displayed or licensed by this work.

Source English/Spanish instructions are retained. Spanish exercise names are newly authored from an explicit movement/modifier glossary and overrides; the 79 core names have explicit curated labels. Technical terms such as muscle-up remain searchable. The full labels are inspectable in `spanish-names.tsv`. These translations have not undergone an independent professional terminology review. Added movement descriptions are short original identification text, not copied articles or detailed technique coaching. Per-source IDs and UUIDv5 identities make subsequent imports deterministic. Repeated source names retain distinct source IDs.

Run `scripts/prepare-exercise-catalog.py` with Python to regenerate the catalog, coverage, Spanish label review sheet and migration from the pinned local source. It rejects unknown glossary terms or missing bilingual text. No third-party code or translation service is executed.

## Application and database behavior

All signed-in athletes can read catalog rows (`athlete_id is null`) alongside their own custom exercises. Only administrative migrations can publish or modify shared metadata. Client insert/update column grants and RLS prevent ownership changes or catalog edits. Anonymous reads remain denied.

Exercise reference FKs now reference the UUID, with a private SECURITY DEFINER trigger enforcing shared-or-same-owner on PRs, prescriptions and completed sets. All other athlete composite FKs remain. The internal session writer accepts shared IDs; public payload guards and append-only logging remain intact. Language changes never change exercise IDs or historical results. Shared movements cannot be archived by an athlete; private custom movements retain archive/restore.

Server reads use stable 500-row pages to overcome the 1,000-row response limit. Library results paginate by 40; movement/PR pickers search all loaded names and aliases in either language, normalize accents, and show up to 100 matches. Selected values remain available when changing a search. Instructions load on demand with authenticated RLS. Actual result/PR labels follow the chosen language.

Migrations `202611120004` and `202611120005` were applied through the signed-in hosted SQL Editor. The import used 100-row batches to fit the editor limit; repeating the last batch kept the count at 1,379. Reconcile these manually applied migration versions before using CLI migration management.

## Verification

- Rollback-only schema/import tests passed before committing the schema.
- Hosted core-training, section-logging and shared-exercise transaction tests passed; all fixture users and records rolled back.
- Read-only hosted verification passed: 17 RLS tables, 178 columns, four API functions, zero callable private helpers, 1,379 shared exercises, 1,324 source exercises, 55 additions, and no incomplete bilingual entries or temporary test accounts.
- Desktop/mobile catalog checks exercise the entire 1,379-row isolated fixture, multilingual search, language-independent selection identity, independent prescription and result logging. They do not prove hosted authentication.
- Unit checks validate all catalog identities, bilingual content, absence of media and short abbreviation matching. Final regression/lint/type results are recorded below.

Production builds remain deferred during the user's current changes. No deployment was performed.

Final results: all 20 desktop/mobile workflows were verified (16 passed on the initial full regression run; four navigation checks passed on recheck with a 20-second condition-based wait for development route compilation). All 29 unit tests, strict TypeScript and lint passed. Catalog generation and hosted assertions explicitly distinguish the dataset's bar-based kipping muscle-up from the new ring variation. An unreferenced import entry was corrected transactionally before final verification; the correction aborts if it would affect existing references. No athlete history was changed. The main development preview returned HTTP 200. No production build ran.
