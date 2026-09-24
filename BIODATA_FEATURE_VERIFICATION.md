# Biodata Family Photo and decimal feet

Implemented and verified on 24 September 2026.

## Implementation and root cause

The checked-in code used integer centimetres and had no separate Family Photo reference. The local PostgreSQL database had already run `ProfileFamilyPhoto1710000088000` and `HeightDecimalFeet1710000089000`, neither of which was present in the current source tree. Its three height columns were already `numeric(3,1)` feet, with 3–8 feet constraints, and one existing family photo. Updating only the UI or blindly converting that database again would have been incorrect.

The implementation now consistently uses `heightFeet`, `preferredHeightMinFeet`, `preferredHeightMaxFeet`, `heightMinFeet`, and `heightMaxFeet` across forms, DTOs, persistence, responses, filtering, compatibility scoring, cards and previews. Height accepts 3–8 decimal feet with at most one decimal place, matching the existing database contract. `5.6` means decimal feet, not five feet six inches.

Backend transforms validate the original request value, including when Nest enables implicit conversion. Invalid strings such as `5.`, `5..6`, `5e0`, alphabetic input, negative numbers, out-of-range values, and excess precision are rejected. Personal height and preference bounds remain required; omitted search bounds remain optional. Inverted preference/search bounds are rejected.

Family Photo appears immediately after Photographs. It reuses `PhotoUploader`, presigned uploads, upload completion, image moderation, authentication, profile ownership/stewardship checks, and media reference signing. `PUT /profiles/:id/details/family-photo` stores its reference in `profile_details.familyPhotoUrl`. Existing Biodata fetch/view paths return it to authorized viewers; limited profile responses retain their existing privacy restrictions. The saved-details view displays it. Replacing it saves the new reference without changing the portrait gallery or its completion requirement. The shared uploader now waits for attachment saving before allowing another upload.

## Database and existing data

`BiodataFeetAndFamilyPhoto1710000090000`:

- Adds the nullable Family Photo column only if absent.
- Converts only explicitly named centimetre columns, dividing by 30.48 and rounding to the established one-decimal feet precision.
- Preserves nulls and never reconverts columns already named in feet.
- Refuses ambiguous schemas containing both unit representations.
- Retains/adds the 3–8 feet database constraints.
- Is deliberately forward-only: rollback requires a pre-migration backup because conversion loses precision and some installations already had these columns.

The migration was applied locally. An aggregate digest of all 26 existing Biodata rows was identical before and after. After integration-test cleanup, 26 rows remained, with the same 5.2–6.2 feet height range and one existing family-photo reference; no generated test accounts remained.

Old session-storage drafts convert only their explicitly centimetre-labelled keys once, preserving other draft fields and any existing feet values. Historical migrations were not edited. Frontend/mobile and API changes should be deployed together because the height API field names now explicitly identify feet.

## Verification

| Check | Result |
| --- | --- |
| Frontend typecheck | Passed |
| Frontend tests | 12 suites, 117 tests passed |
| Frontend production build | Passed; sandbox-blocked esbuild access required an approved retry |
| Frontend lint | No lint script/configuration provided by this project |
| Backend typecheck | Passed |
| Backend lint | Passed with zero warnings |
| Backend production build | Passed |
| Backend existing unit suite | 39 suites, 461 tests passed; existing external MinIO suite: 9 tests skipped |
| New backend DTO validation tests | 30 passed, using production-style implicit conversion |
| Feature HTTP/browser/database integration | 9 tests passed |
| Existing package-range API regression | 2 tests passed, including PostgreSQL constraints and Individual/Family filtering |
| Database migration | Existing feet data unchanged; original-cm conversion, null preservation, and repeat execution tested in a transaction-isolated schema |
| Mobile typecheck | Blocked by missing mobile dependencies, including `expo/tsconfig.base` and React Native |
| Conflict/whitespace checks | No conflict markers found; `git diff --check` passed |

Integration coverage includes real PNG presign, byte upload, completion, save, fetch, replacement, database reads, and storage reads for Bride, Groom, Family steward, and Agent steward profiles. It covers all requested sample heights and both boundaries; invalid direct API bodies and filters; anonymous/other-user/former-steward denial; logout/login; and a complete Nest application restart.

A real headless Chrome test against the production frontend build covers required/invalid height form validation, saving `5.6`, uploading and replacing Family Photo, page refresh, logout/login, and rendering the saved height/photo. The browser test is enabled by `CHROME_BIN`; the backend integration environment needs PostgreSQL, Redis, the standard backend environment variables, and mock media storage. Set `MEDIA_MOCK_DIR` to a writable test directory. Build the frontend before running:

```text
npm run test:e2e -- --testPathPattern=biodata-media-height
```

Storage integration used the local/mock provider and existing heuristic moderation; live S3/hosted moderation was not exercised. Existing private-media signing/access unit tests passed, and uploaded-reference DTO tests cover `media://` references.

## Exact files changed for this feature

Existing changes in these files were retained and extended. Other previously modified files shown by `git status` were not reset, stashed, reverted, or discarded.

### Backend

```text
backend/src/common/util/height.ts
backend/src/database/migrations/1710000090000-BiodataFeetAndFamilyPhoto.ts
backend/src/modules/admin/admin-accounts.service.ts
backend/src/modules/matchmaking/compatibility.engine.ts
backend/src/modules/matchmaking/compatibility.engine.spec.ts
backend/src/modules/matchmaking/dto/matchmaking.dto.ts
backend/src/modules/matchmaking/matchmaking.service.ts
backend/src/modules/profile-details/dto/profile-details.dto.ts
backend/src/modules/profile-details/entities/profile-details.entity.ts
backend/src/modules/profile-details/profile-details.controller.ts
backend/src/modules/profile-details/profile-details.service.ts
backend/src/modules/profile-details/profile-details.service.spec.ts
backend/src/modules/profile-details/height-validation.spec.ts
backend/src/modules/users/dto/public-profile.dto.ts
backend/src/modules/users/users.service.ts
backend/test/biodata-browser.ts
backend/test/biodata-media-height.e2e-spec.ts
backend/test/package-range.e2e-spec.ts
```

The small `users.service.ts` adjustment adds a property guard and typed name accesses to the existing developer-written guardian/parent lookup, resolving the pre-existing build/lint blockers without adding a guardian database field.

### Frontend

```text
frontend/src/components/HeightInput.tsx
frontend/src/components/HeightInput.test.tsx
frontend/src/components/MatchCard.tsx
frontend/src/components/PhotoUploader.tsx
frontend/src/components/ProfileCard.tsx
frontend/src/components/ProfilePreview.tsx
frontend/src/components/SavedBiodata.tsx
frontend/src/lib/biodata-draft.ts
frontend/src/lib/height.ts
frontend/src/lib/height.test.ts
frontend/src/pages/Biodata.tsx
frontend/src/pages/Matches.tsx
frontend/src/pages/admin/AdminProfileDetail.tsx
```

### Existing mobile API consumers and documentation

```text
mobile/src/app/biodata.tsx
mobile/src/app/match/[id].tsx
mobile/src/components/biodata/preferences-section.tsx
BIODATA_FEATURE_VERIFICATION.md
```

Mobile height consumers were updated so the API field rename does not leave them reading or sending obsolete centimetre fields. No duplicate Biodata implementation or upload mechanism was introduced.
