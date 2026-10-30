# Building Tags – Technical Requirement Document

> Example only. This TRD shows the shape and depth /zdev:new-trd produces. Paths, names and figures are illustrative and were not checked against the zOne code.

| Item | Value |
| --- | --- |
| Feature | Free-text tags on buildings, shown and searchable in the Buildings grid |
| Parent PRD / Work item | Task 18400 (example) |
| Location / Path | Portfolio > Buildings grid; Add / Edit Building |
| Modules | Portfolio (backend), Portfolio Buildings (frontend) |
| Technology | .NET 7 · EF Core · SQL Server · React / TypeScript |
| Type | New Development |
| Author | Abhijith G |
| Status | Draft r1 |
| Date | 2026-10-30 |

## 1. Overview

Users can add short labels such as "HVAC-2024" or "Leased" to a building and find buildings by those labels in the Buildings grid.

### 1.1 Problem statement

Facility managers label buildings with ad-hoc attributes in spreadsheets, because zOne has no light-weight label on Building. Creating a data field for every label needs an administrator and clutters the Add / Edit form.

### 1.2 Business objective and value

- Users find groups of buildings in one search instead of exporting to Excel.
- No administrator involvement for one-off labels.
- Target: tag search returns in under 1 second for an account with 50,000 buildings.

### 1.3 Scope

**In scope**

- Add and remove up to 20 tags on a building from Add / Edit Building.
- A Tags column in the Buildings grid, included in keyword search.

**Out of scope**

- Tags on Site, Floor or other entities (see section 23).
- Bulk tagging and import of tags.
- Tag colours or a managed tag list.

### 1.4 Glossary

| Term | Meaning |
| --- | --- |
| Tag | A short free-text label, 1–50 characters, attached to one building |

## 2. Requirement mapping

| ID | PRD requirement | Technical implementation | TRD section | Comments / assumptions |
| --- | --- | --- | --- | --- |
| R1 | Users can tag a building | New table base.BuildingTags and tag endpoints | Task 1 | Up to 20 tags (assumed, open question) |
| R2 | Tags show in the Buildings grid | Tags column, hidden by default, in Display Settings | Task 2 | — |
| R3 | Users can search by tag | Grid keyword search includes tags, server side | Task 2 | Contains match |
| R4 | Only editors change tags | PORTFOLIO_MANAGE_BUILDINGS (M) on save | Task 1, 2 | View users see tags read-only |
| R5 | Tag colours | — | — | Not delivered – out of scope this release |

## 3. Assumptions, dependencies and constraints

| Type | Item | Status / Owner |
| --- | --- | --- |
| Assumption | Tags are not personal data; the UI says so in help text | Confirmed by product |
| Assumption | 20 tags per building is enough | Open – product |
| Dependency | Buildings grid display settings support a new column | Portfolio team |
| Constraint | FedRAMP boundary: no new external service; existing auth and logging only | Fixed |
| Constraint | Platform page size of 50 (PAGE_COUNT) | Fixed |

## 4. Existing system analysis

**Current behaviour and components**

| Area | Current behaviour | Component | Reference |
| --- | --- | --- | --- |
| Building save | Add / Edit Building posts the whole building model; custom fields go to AssetMetadata JSON | BuildingController | `BuildingController.cs` (example) |
| Buildings grid | Keyword search runs in SQL over name, code and address | BuildingService.GetList | `BuildingService.cs` (example) |
| Audit | Building changes are recorded through IChangesetTrackable | Building entity | `Building.cs` (example) |

**Existing limitations**

- No way to label a building without an administrator creating a data field.
- Searching AssetMetadata JSON scans every building's metadata, so a JSON-based label would be slow to search.

**Reason for change**

Users keep labels outside zOne, which breaks search and reporting. A light-weight, indexed tag solves both without admin work.

## 5. Proposed solution

### 5.1 Architecture overview

Tags are stored in a new table keyed by building, saved through a dedicated endpoint in the existing Portfolio controller → service → repository layers, and joined into the existing grid query for display and search. The Add / Edit Building form gets a tag input built from the existing V2 chip component.

### 5.2 Component interaction

| Component | Responsibility | Talks to |
| --- | --- | --- |
| Tag input (frontend) | Collect and validate tags in the form | Building tags API |
| BuildingTagsController | Route, privilege check, request validation | BuildingTagService |
| BuildingTagService | Normalise tags, enforce limits, replace in one transaction, audit | BuildingTags repository, activity log |
| BuildingService.GetList | Grid list and keyword search, now including tags | base.BuildingTags |

### 5.3 Request flow

```text
User ──> Add / Edit Building ──> POST .../buildings/{id}/tags
                                    │
                    BuildingTagsController (privilege, validation)
                                    │
                    BuildingTagService ──> base.BuildingTags (replace)
                                    │
                                    └──> Activity log (added / removed)
```

1. The form saves the building, then posts the tag list with the rowVersion it read.
2. The controller checks the privilege and the building's account and access.
3. The service trims and de-duplicates tags, checks the limits and the rowVersion, replaces the rows in one transaction and writes one activity log entry.

### 5.4 Data flow

**Scenario: add tags to an untagged building**

| Table | Column | Before | After |
| --- | --- | --- | --- |
| base.BuildingTags | Tag (BuildingId 1042) | — | HVAC-2024 |
| base.BuildingTags | Tag (BuildingId 1042) | — | Leased |

**Scenario: replace tags, with a duplicate in different case**

| Table | Column | Before | After |
| --- | --- | --- | --- |
| base.BuildingTags | Tag (BuildingId 1042) | HVAC-2024, Leased | Leased, Roof-Survey |
| Activity log | Details | — | Added: Roof-Survey; Removed: HVAC-2024 |

Request sent: `["Leased", "leased ", "Roof-Survey"]`; "leased " is merged into "Leased".

### 5.5 Key decisions

#### Decision: separate table instead of AssetMetadata JSON

| Question | Answer |
| --- | --- |
| Why this approach | An indexed table makes tag search fast; JSON search scans every building's metadata |
| Alternatives considered | AssetMetadata JSON – no schema change, but slow search and no uniqueness rule. A new data field type – needs admin setup per account, which the PRD rejects |
| Risks and trade-offs | One more table and migration; tags are not part of the generic data field engine |
| Components impacted | New table base.BuildingTags; Building API; Buildings grid query; Add / Edit Building form |
| Testing and support | API and E2E tests in section 15; tag changes appear in the activity log |
| Edge cases and failure behaviour | Duplicate tags are merged; over-limit saves are rejected whole, nothing partial is written |

## 6. Tasks

### Task 1 – Database and Tag API

#### Purpose

Store tags per building and let the form replace a building's tags in one call.

#### Data model

**New table `base.BuildingTags`**

| Column | Type | Notes |
| --- | --- | --- |
| BuildingTagId | int, identity | Primary key |
| BuildingId | int | The tagged building |
| AccountId | uniqueidentifier | Owning account (tenant scope) |
| Tag | nvarchar(50) | Trimmed text as entered |
| AddedBy / AddedOn | uniqueidentifier / datetime2 | Audit columns |

Keys, indexes and constraints are in section 13.

#### Functional flow

1. The user opens Add / Edit Building and types a tag, then presses Enter.
   - The tag is trimmed; empty input is ignored.
   - Longer than 50 characters: "A tag can have at most 50 characters".
   - A tag already on the building (any case) is not added twice.
2. The user saves the building. The form calls the tag endpoint after the building save succeeds.
   - More than 20 tags: "A building can have at most 20 tags"; no tags are changed.
   - Another user changed the tags meanwhile: "This record was changed by another user. Reload and try again".
3. The API replaces the building's tags in one transaction and writes one activity log entry with the added and removed tags.

#### API changes

| Method | Endpoint | Authentication / privilege | Description |
| --- | --- | --- | --- |
| GET | `api/v1/portfolio/buildings/{buildingId:Guid}/tags` | Signed-in user, PORTFOLIO_MANAGE_BUILDINGS (V) | List a building's tags |
| POST | `api/v1/portfolio/buildings/{buildingId:Guid}/tags` | Signed-in user, PORTFOLIO_MANAGE_BUILDINGS (M) | Replace a building's tags |

##### GET `api/v1/portfolio/buildings/{buildingId:Guid}/tags`

Returns the building's tags in the order they were added, with the row version used for the next save.

Authentication: existing session; View or Manage; building must be in the caller's account and building access.

Response – 200

```json
{
  "data": { "tags": ["HVAC-2024", "Leased"], "rowVersion": "AAAAAAAAB9E=" },
  "responseDescription": ""
}
```

##### POST `api/v1/portfolio/buildings/{buildingId:Guid}/tags`

Replaces all tags of the building. Sending an empty list removes every tag.

Authentication: existing session; Manage; building must be in the caller's account and building access.

Request

```json
{
  "tags": ["HVAC-2024", "Leased", "Roof-Survey"],
  "rowVersion": "AAAAAAAAB9E="
}
```

Response – 200

```json
{
  "data": { "tags": ["HVAC-2024", "Leased", "Roof-Survey"], "rowVersion": "AAAAAAAAB+A=" },
  "responseDescription": "Tags saved"
}
```

Validation rules

| Field | Rule | Message |
| --- | --- | --- |
| tags | Required list, at most 20 items after de-duplication | "A building can have at most 20 tags" |
| tags[] | Trimmed, 1–50 characters; blank items ignored | "A tag can have at most 50 characters" |
| rowVersion | Required; must match the current value | "This record was changed by another user. Reload and try again" |

Error handling

| Status | When | Message |
| --- | --- | --- |
| 401 | Missing privilege | — |
| 500 | More than 20 tags | "A building can have at most 20 tags" |
| 500 | A tag over 50 characters | "A tag can have at most 50 characters" |
| 500 | Building not in the caller's account or building access | "Building not found" |
| 500 | Stale rowVersion | "This record was changed by another user. Reload and try again" |

#### Acceptance criteria

- [ ] Saving 1 to 20 tags stores them and GET returns them in order
- [ ] "Leased" and " leased " on the same building are stored once
- [ ] Saving 21 tags fails with the limit message and leaves the old tags unchanged
- [ ] A user with View only gets 401 on POST
- [ ] Another account's building id returns "Building not found"
- [ ] A save with an old rowVersion fails with the concurrency message

### Task 2 – Buildings grid and form

#### Purpose

Show tags in the grid, include them in keyword search, and add the tag input to Add / Edit Building.

#### Functional flow

1. The grid shows a Tags column (comma-separated, cut off with a tooltip after 3 tags). It is available in Display Settings and hidden by default.
2. Keyword search matches buildings whose tags contain the keyword, across the full authorized list, server side.
3. Sorting on Tags is not offered (multi-value column).

#### UI changes

Screens and fields: PRD section 3 and the Figma Building Tags frames (example).

| Field / action | Validation rule | Error message |
| --- | --- | --- |
| Tag input | 1–50 characters after trimming | "A tag can have at most 50 characters" |
| Add tag | At most 20 per building | "A building can have at most 20 tags" |

| Role / privilege | Can see | Can do |
| --- | --- | --- |
| PORTFOLIO_MANAGE_BUILDINGS (V) | Tags column, tag chips on the form | Read only |
| PORTFOLIO_MANAGE_BUILDINGS (M) | Same | Add and remove tags |

Components: the existing V2 chip input, as used on Document Hub filters (example). States: read-only chips for View users; error text under the input.

#### Acceptance criteria

- [ ] Searching "HVAC" finds a building tagged "HVAC-2024" on any page of the grid
- [ ] The Tags column can be shown and hidden in Display Settings and the choice is kept
- [ ] A View user sees chips but no add or remove controls

## 7. API conventions

| Topic | Convention |
| --- | --- |
| Routes and verbs | Under api/v1; GET reads, POST writes; ids are UniqueId GUIDs |
| Authentication | Existing session authentication; no new auth path |
| Success | HTTP 200 with APIResult { data, responseDescription } |
| Errors | HTTP 500 with { message, errorType, traceId }; missing privilege HTTP 401 (PrivilegeFilter) |
| Concurrency | rowVersion read with the tags must be sent on save |
| Tenant and access | Building resolved inside the caller's account and building access |
| Backward compatibility | New endpoints; the grid list response gains an additive tags field |

## 8. Impact analysis

| Area | Change | Affected consumers | Risk | Mitigation |
| --- | --- | --- | --- | --- |
| Modules | Portfolio only | — | Low | — |
| Integrations | None | Mobile app does not show tags | Low | Listed in section 23 |
| APIs | Two new endpoints; grid list returns a tags field | Buildings grid, export | Medium | New field is additive |
| Database | New table, two indexes | Building delete check | Low | Restrict FK; soft delete keeps rows |
| User workflows | New input on Add / Edit Building | Building editors | Low | Optional field |

## 9. Security considerations and FedRAMP compliance

**Summary**

| Topic | This feature |
| --- | --- |
| Authentication | Existing session authentication only |
| Authorization | View reads, Manage changes, via PORTFOLIO_MANAGE_BUILDINGS; building access applies |
| Sensitive data | None; tags are classified as non-PII and help text says so |
| Data exposure risks | Tags visible to anyone with building View access, the same as other building fields |
| Audit requirements | Every tag change, with user, time and added / removed tags |
| Input validation | Length, count and trimming on the server |
| Data retention | Kept with the building; soft-deleted buildings keep their tags, as with AssetMetadata |

**Abuse and exposure review**

| Abuse / exposure case | Possible? | Prevention |
| --- | --- | --- |
| Read or change another account's tags by guessing ids | No | Building resolved inside the caller's account and building access |
| View user changes tags | No | Manage privilege on POST |
| Storing personal data in tags | Yes, by user choice | Help text; tags are short and visible to all building viewers |
| Oversized payload to exhaust the database | No | 20 tags × 50 characters enforced before any write |

**NIST 800-53 r5 / FedRAMP controls**

| Control | How this feature complies |
| --- | --- |
| AC-3 / AC-6 Access enforcement, least privilege | View can read, Manage can change, via the existing PORTFOLIO_MANAGE_BUILDINGS privilege |
| AC-4 Tenant isolation | Every query filters by AccountId and the user's building access |
| AU-2 / AU-3 / AU-12 Audit events | Tag changes logged with user, time, building and added / removed tags |
| AU-9 Audit protection | Activity log is append-only; the feature has no delete on it |
| IA-2 Identification and authentication | Existing authentication only |
| SC-8 Transmission confidentiality | Existing TLS 1.2+ endpoints; no new external call |
| SC-13 Cryptographic protection | n/a – no new cryptography |
| SC-28 Protection at rest | Stored in the existing encrypted database; tags are not PII |
| SC-7 Boundary protection | No new service, package source or data flow outside the boundary |
| SI-10 Input validation | Length, count and trimming enforced on the server, not only in the form |
| SI-11 Error handling | Business messages and traceId only; no SQL or stack trace returned |
| SI-12 Information retention | Follows the building's existing retention |
| CM-3 / CM-4 Change control | One reviewed EF migration; no significant change to the boundary |
| RA-5 / SA-11 Scanning and testing | No new packages; existing SAST and dependency scans cover the change |

## 10. Monitoring and logging

**Logs to be added**

| Event | Where logged | Fields | Purpose |
| --- | --- | --- | --- |
| Tags changed | Activity log (IActivityLogger) | User, building id, added and removed tags, time | Audit |
| Tag save failed | Application log | traceId, building id, error type (no tag text) | Diagnosis |

**Metrics to track**

| Metric | Source | Normal range |
| --- | --- | --- |
| Tag save failures per hour | Existing application monitoring | Under 1% of saves |
| Grid list duration with a keyword | Existing request timing | Under 1 second |

**Alerts required**

| Alert | Condition | Who is notified |
| --- | --- | --- |
| None | Existing API error-rate alert covers the new endpoints | — |

**Support runbook**

| Symptom | Likely cause | How to check | Resolution |
| --- | --- | --- | --- |
| Tags vanish after save | Another user saved over them | Activity log for the building | Explain concurrency; user reloads |
| Search does not find a tag | Tag has a typo or extra characters | `SELECT Tag FROM base.BuildingTags WHERE BuildingId = @id` | Correct the tag |

Operational owner: Portfolio team.

## 11. Performance and scalability

| Topic | This feature |
| --- | --- |
| Expected volume | Up to 50,000 buildings and 200,000 tags per large account |
| Query impact | One extra query per building save; grid joins tags with STRING_AGG per page of 50 rows |
| Indexing strategy | Seek by building; narrow account-level index for search (section 13) |
| Bulk operations | n/a – one building at a time; 20 tags per save at most |
| Pagination approach | Existing server-side grid paging, 50 rows, total count unchanged |
| 10x growth | 2 million tags per account: the contains-search scan of the account's tags becomes the bottleneck first; full-text index is the path (section 23) |

**Caching**

| Data | Cache? | Where | Key | Expiry / invalidation | Why |
| --- | --- | --- | --- | --- | --- |
| A building's tags | No | — | — | — | Read once per form open by an index seek; caching adds invalidation work for no gain |
| Buildings grid page with tags | No | — | — | — | Results depend on keyword, sort, page and building access; hit rate would be low |
| User privileges | Yes (existing) | Platform privilege cache | AccountId + UserId | Existing rules | Already cached; the tag endpoints reuse it, nothing new |

## 12. Edge cases and failure scenarios

| Scenario | Expected behaviour | Handling |
| --- | --- | --- |
| Building saved but tag save fails | Building is saved; form shows the tag error and keeps the typed tags | Form retries on next save |
| Two users save tags at the same time | Second save fails with the concurrency message | rowVersion check in the service |
| Building soft deleted | Tags kept, hidden with the building | Same as AssetMetadata today |
| Tag with only spaces | Ignored | Trimmed on client and server |
| Unicode or emoji in a tag | Stored and shown as entered | nvarchar column |

## 13. Database changes

New storage is required because AssetMetadata JSON cannot be indexed for tag search or enforce one-tag-per-building.

**Design**

| Choice | Decision | Reason |
| --- | --- | --- |
| Normalisation | One row per building and tag | Indexed search and a database-enforced uniqueness rule; JSON could have neither |
| AccountId on the row | Stored, although derivable from the building | Tag search filters by account without joining Buildings first |
| Data type | nvarchar(50), case-insensitive collation | Unicode tags; "Leased" and "leased" count as the same tag |
| Delete behaviour | Foreign key Restrict; building soft delete keeps tags | Matches how AssetMetadata is kept today; no Cascade |

**Relationships**

| Parent | Child | Cardinality | On delete | Why |
| --- | --- | --- | --- | --- |
| Buildings | base.BuildingTags | 1 : 0..20 | Restrict | A tag always belongs to one building |

**Indexes**

| Index | Table | Key columns (INCLUDE) | Query it serves | Notes |
| --- | --- | --- | --- | --- |
| PK_BuildingTags | base.BuildingTags | BuildingTagId | Row identity | Clustered; ever-increasing key keeps inserts cheap |
| UX_BuildingTags_BuildingId_Tag | base.BuildingTags | BuildingId, Tag | GET tags of a building; grid STRING_AGG per page; duplicate check | Unique; also serves the foreign key |
| IX_BuildingTags_AccountId_Tag | base.BuildingTags | AccountId, Tag (BuildingId) | Grid keyword search on tags | A contains-match cannot seek on Tag, but this narrow index limits the scan to the account's tag rows. Write cost: one extra index per tag insert |

**Constraints**

| Constraint | Table | Type | Rule enforced |
| --- | --- | --- | --- |
| PK_BuildingTags | base.BuildingTags | Primary key | Row identity |
| FK_BuildingTags_Buildings | base.BuildingTags | Foreign key (Restrict) | A tag always belongs to an existing building |
| UX_BuildingTags_BuildingId_Tag | base.BuildingTags | Unique | No duplicate tag on a building, even with concurrent saves |
| CK_BuildingTags_Tag_NotBlank | base.BuildingTags | Check | LEN(LTRIM(RTRIM(Tag))) > 0 |
| DF_BuildingTags_AddedOn | base.BuildingTags | Default | AddedOn = SYSUTCDATETIME() |
| — | base.BuildingTags | API rule | At most 20 tags per building; a check constraint cannot count rows, so the API enforces it inside the save transaction |

**New tables and objects**

| Object | Type | Module / Schema | Why required | Task |
| --- | --- | --- | --- | --- |
| base.BuildingTags | Table | Portfolio / base | Tags per building | Task 1 |
| UX_BuildingTags_BuildingId_Tag | Unique index | Portfolio / base | No duplicate tag per building | Task 1 |
| IX_BuildingTags_AccountId_Tag | Index | Portfolio / base | Tag search | Task 1 |
| CK_BuildingTags_Tag_NotBlank, DF_BuildingTags_AddedOn | Constraints | Portfolio / base | Blank tag guard, audit default | Task 1 |

**Modified tables and columns added**

None.

**Used without schema change**

| Object | Access | Columns used | Why | Task |
| --- | --- | --- | --- | --- |
| Buildings | Read | BuildingId, UniqueId, AccountId, Status | Resolve and scope the building | Task 1, 2 |
| Activity log | Write | Existing columns | Audit tag changes | Task 1 |

## 14. Migration strategy

| Topic | Plan |
| --- | --- |
| Schema migration | EF migration AddBuildingTags in the Portfolio module, applied automatically on deploy |
| Data migration steps | None – no existing data |
| Validation approach | `SELECT COUNT(*) FROM base.BuildingTags` returns 0 without error after deploy |
| Rollback strategy | The migration's Down drops the table and indexes; tags entered since go-live are lost |

## 15. Testing strategy

| Level | Scope | Cases (positive / negative) |
| --- | --- | --- |
| Unit | Tag normalisation | Trim, de-duplicate, length and count limits |
| Integration / API | Both endpoints | Save, replace, clear; 21 tags; stale rowVersion; View user POST |
| E2E automation (Playwright) | Form and grid | Add and remove tags; search finds a tag on page 2 |
| Regression | Buildings grid, export, Add / Edit Building | Existing columns, search and save unchanged |
| Security | Cross-tenant ids, missing privilege, input tampering | Other account's building; 401; oversized payload |
| Performance | Grid search | 50,000 buildings, 200,000 tags, under 1 second |
| UAT | Two facility managers from the pilot account | Tag 20 buildings, search, edit tags concurrently |

Edge cases to test: every row of section 12.

## 16. Deployment, cutover and rollback

| Topic | Plan |
| --- | --- |
| Deployment approach | Backend and migration first, then frontend; no feature flag; column hidden by default |
| Cutover plan | 1. Deploy backend (migration runs). 2. Verify the table exists. 3. Deploy frontend. 4. Tell pilot users. No downtime; no point of no return |
| Post-deployment validation | Add, search and remove a tag on a test building; check the activity log entry |
| Rollback strategy | Previous frontend, then previous backend, then the migration's Down |

## 17. End-user impact

| Topic | This feature |
| --- | --- |
| Number of clicks | Export to Excel and filter (6+ steps) → type in grid search (1 step) |
| Discoverability | Tag input on the building form; Tags column in Display Settings |
| Error messaging | Plain limits with the number ("at most 20 tags") |
| Accessibility | Keyboard only (Enter adds, Backspace removes); chips readable by screen readers |
| Workflow efficiency | Labels live in zOne; no admin request |

## 18. Risks and mitigations

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Free text creates near-duplicates ("Leased", "Lease") | Search misses buildings · Medium | High | Managed tag list considered in section 23 |
| Users put contact details in tags | Unplanned PII · Medium | Low | Help text; tags reviewed as non-PII |
| Large data volume | Slow tag search · Medium | Low | Narrow index now; full-text index at 10x |

## 19. General design considerations

| Area | Question | Answer |
| --- | --- | --- |
| Architecture alignment | Aligned, reused, no needless complexity or debt? | Uses the existing controller → service → repository layers, privilege filter and activity log; one small table, no new framework |
| SOLID | Where do the principles apply? | Single responsibility: the tag service owns normalisation and limits only. Dependency inversion: the service depends on a repository interface, so it is unit-testable. Open/closed: a later EntityTags table extends without changing callers |
| Security and compliance | Least privilege, exposure, audit, retention, FedRAMP | See section 9 |
| Scalability | Will it perform at 10x? | Yes up to ~2 million tags per account; see section 11 |
| Supportability | Can support diagnose issues? | Yes: activity log, traceId in app log, runbook; see section 10 |
| Testability | Unit, integration, regression, automation? | Yes; see section 15 |
| User experience | Clicks, discoverability, errors, accessibility | See section 17 |
| Future extensibility | Configuration, compatibility, upgrades | See section 23 |

## 20. Decisions from review

- Tags stored in a new table, not AssetMetadata – Abhijith G, 2026-10-29

## 21. Open questions

| Question | Owner | Needed by |
| --- | --- | --- |
| Confirm the 20-tag limit | Product | Before development |

## 22. Implementation brief for developers and AI agents

**Feature in one paragraph**

Users add up to 20 free-text tags (1–50 characters, unique per building, case-insensitive) to a building in Add / Edit Building. Tags are stored in base.BuildingTags, replaced in one call, shown in an optional Buildings grid column and matched by keyword search server side. Access follows PORTFOLIO_MANAGE_BUILDINGS: View reads, Manage changes.

**Codebase map**

| Layer | Path | Existing pattern to copy | What to add or change |
| --- | --- | --- | --- |
| Database | Portfolio migrations folder | An existing Portfolio EF migration | AddBuildingTags migration and entity |
| Backend API | Portfolio controllers and services | Building controller and service | Two tag endpoints, grid query join |
| Frontend | Portfolio Buildings pages | Document Hub filter chip input (V2) | Tag input on the form; Tags column |
| Tests | Playwright suite for Buildings | Existing Buildings grid spec | Cases from section 15 |

**Build order**

1. Migration and entity (Task 1); done when the table exists locally.
2. Tag endpoints with validation and audit (Task 1); done when the API acceptance criteria pass.
3. Grid column and search (Task 2).
4. Form tag input (Task 2); done when the E2E cases pass.

**Rules that must not be broken**

- Every query scoped by AccountId and building access.
- Validation on the server; the form only mirrors it.
- Restrict foreign key, never Cascade.
- No new package or external service.

**Definition of done**

- [ ] All acceptance criteria in section 6 pass, positive and negative
- [ ] Section 15 tests written and green; build and lint clean
- [ ] Logging in section 10 verified; section 9 controls met
- [ ] Migration applied and rolled back cleanly on a copy of production data

## 23. Future scaling and extensibility

| Topic | Today (this release) | Limit / trigger | Path forward |
| --- | --- | --- | --- |
| Data volume | Up to ~200,000 tags per account | Search slows past a few million rows | Full-text index on Tag |
| Load | One query per save, one join per grid page | None expected | — |
| Extensibility | Building only | Site or Floor tags requested | Generic EntityTags table keyed by entity type and id |
| Integrations | Web only | Mobile app or public API needs tags | Expose tags in the building API model |
| Configuration | Free text | Near-duplicate tags become common | Optional managed tag list per account (configuration, not custom code) |
| Backward compatibility and upgrades | Additive endpoints and field | Moving to EntityTags | Copy rows in a migration; keep the building endpoints as a facade |

## 24. Revision history

| Revision | Date | Author | Changes |
| --- | --- | --- | --- |
| r1 | 2026-10-30 | Abhijith G | First draft |

## Appendix A – TRD design checklist

**Business and functional**

- [x] Problem statement clearly defined
- [x] Business objective understood
- [x] Requirements mapped to solution
- [x] Scope and out of scope documented
- [x] Assumptions identified
- [x] Open questions captured

**Architecture and design**

- [x] Solution aligns with existing architecture
- [x] Reuse of existing components evaluated
- [x] SOLID principles considered
- [x] Design minimises technical debt
- [x] Alternative approaches considered and documented

**Functional flow**

- [x] Happy path covered
- [x] Error scenarios covered
- [x] Edge cases identified
- [x] Concurrency scenarios evaluated
- [x] Validation rules documented

**Data and database**

- [x] Data model changes documented
- [x] Indexing requirements reviewed
- [x] Data retention requirements evaluated
- [x] Data migration considerations documented
- [x] Rollback approach identified

**API and integration**

- [x] API contract documented
- [x] Error handling defined
- [x] Backward compatibility considered
- [x] External dependencies identified

**Security and compliance**

- [x] Authentication requirements reviewed
- [x] Authorization requirements reviewed
- [x] Sensitive data handling reviewed
- [x] Audit requirements documented
- [x] NIST / FedRAMP implications considered
- [ ] Regulatory or organisational compliance requirements reviewed – example only; no regulatory source supplied

**Performance and scalability**

- [x] Expected data volumes evaluated
- [x] Query performance reviewed
- [x] Pagination strategy defined
- [x] Scalability considerations documented
- [x] 10x growth scenario considered

**Supportability and operations**

- [x] Logging requirements defined
- [x] Monitoring requirements identified
- [x] Alerting requirements identified
- [x] Troubleshooting approach documented
- [x] Production support impact evaluated

**Testing**

- [x] Unit test scenarios identified
- [x] Integration test scenarios identified
- [x] Regression impact identified
- [x] Negative test cases considered

**Deployment**

- [x] Deployment approach documented
- [x] Cutover plan documented
- [x] Rollback strategy documented
- [x] Post-deployment validation defined

**User experience**

- [x] User workflow reviewed
- [x] Discoverability considered
- [x] Error messages reviewed
- [x] Accessibility considerations reviewed
- [x] Click reduction / workflow simplification considered
