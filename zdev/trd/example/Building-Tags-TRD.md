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
| Date | 2026-10-29 |

## 1. Overview

### 1.1 Problem statement

Facility managers label buildings with ad-hoc attributes such as "HVAC-2024" or "Leased" in spreadsheets, because zOne has no light-weight label on Building. Creating a data field for every label needs an administrator and clutters the Add / Edit form.

### 1.2 Business value

- Users find groups of buildings in one search instead of exporting to Excel.
- No administrator involvement for one-off labels.
- Target: tag search returns in under 1 second for an account with 50,000 buildings.

### 1.3 Scope

**In scope**

- Add and remove up to 20 tags on a building from Add / Edit Building.
- A Tags column in the Buildings grid, included in keyword search.

**Out of scope**

- Tags on Site, Floor or other entities (see section 20).
- Bulk tagging and import of tags.
- Tag colours or a managed tag list.

### 1.4 Glossary

| Term | Meaning |
| --- | --- |
| Tag | A short free-text label, 1–50 characters, attached to one building |

## 2. Assumptions, dependencies and constraints

| Type | Item | Status / Owner |
| --- | --- | --- |
| Assumption | Tags are not personal data; the UI says so in help text | Confirmed by product |
| Assumption | 20 tags per building is enough | Open – product |
| Dependency | Buildings grid display settings support a new column | Portfolio team |
| Constraint | FedRAMP boundary: no new external service; existing auth and logging only | Fixed |
| Constraint | Platform page size of 50 (PAGE_COUNT) | Fixed |

## 3. Existing system

| Area | Current behaviour | Reference |
| --- | --- | --- |
| Building save | Add / Edit Building posts the whole building model; custom fields go to AssetMetadata JSON | `BuildingController.cs` (example) |
| Buildings grid | Keyword search runs in SQL over name, code and address | `BuildingService.GetList` (example) |
| Audit | Building changes are recorded through IChangesetTrackable | `Building.cs` (example) |

## 4. Solution overview and key decisions

Tags are stored in a new table keyed by building, saved through a dedicated endpoint, and joined into the existing grid query for display and search. The Add / Edit Building form gets a tag input built from the existing V2 chip component.

### 4.1 Decision: separate table instead of AssetMetadata JSON

| Question | Answer |
| --- | --- |
| Why this approach | An indexed table makes tag search a seek; JSON search scans every building's metadata |
| Alternatives considered | AssetMetadata JSON – no schema change, but slow search and no uniqueness rule. A new data field type – needs admin setup per account, which the PRD rejects |
| Risks and trade-offs | One more table and migration; tags are not part of the generic data field engine |
| Components impacted | New table base.BuildingTags; Building API; Buildings grid query; Add / Edit Building form |
| Testing and support | API and E2E tests in section 13; tag changes appear in the activity log |
| Edge cases and failure behaviour | Duplicate tags are merged; over-limit saves are rejected whole, nothing partial is written |

## 5. Tasks

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

**Keys and indexes**

| Key / Index | Columns | Details |
| --- | --- | --- |
| Primary key | BuildingTagId | Clustered |
| Foreign key | BuildingId | References Buildings(BuildingId). On delete: Restrict |
| Unique index | BuildingId, Tag | No duplicate tag on a building (case-insensitive collation) |
| Index | AccountId, Tag | Tag search across the account |

#### Functional flow

1. The user opens Add / Edit Building and types a tag, then presses Enter.
   - The tag is trimmed; empty input is ignored.
   - Longer than 50 characters: "A tag can have at most 50 characters".
   - A tag already on the building (any case) is not added twice.
2. The user saves the building. The form calls the tag endpoint after the building save succeeds.
   - More than 20 tags: "A building can have at most 20 tags"; no tags are changed.
   - Another user changed the tags meanwhile: "This record was changed by another user. Reload and try again".
3. The API replaces the building's tags in one transaction and writes one activity log entry with the added and removed tags.

#### API specifications

| Method | Endpoint | Privilege | Description |
| --- | --- | --- | --- |
| GET | `api/v1/portfolio/buildings/{buildingId:Guid}/tags` | PORTFOLIO_MANAGE_BUILDINGS (V) | List a building's tags |
| POST | `api/v1/portfolio/buildings/{buildingId:Guid}/tags` | PORTFOLIO_MANAGE_BUILDINGS (M) | Replace a building's tags |

##### GET `api/v1/portfolio/buildings/{buildingId:Guid}/tags`

Returns the building's tags in the order they were added, with the row version used for the next save.

Response – 200

```json
{
  "data": { "tags": ["HVAC-2024", "Leased"], "rowVersion": "AAAAAAAAB9E=" },
  "responseDescription": ""
}
```

##### POST `api/v1/portfolio/buildings/{buildingId:Guid}/tags`

Replaces all tags of the building. Sending an empty list removes every tag.

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

Errors

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

#### UI

- Tag input: the existing V2 chip input component, as used on Document Hub filters (example).
- States: read-only chips for View users; error text under the input for validation messages.

#### Acceptance criteria

- [ ] Searching "HVAC" finds a building tagged "HVAC-2024" on any page of the grid
- [ ] The Tags column can be shown and hidden in Display Settings and the choice is kept
- [ ] A View user sees chips but no add or remove controls

## 6. API conventions

| Topic | Convention |
| --- | --- |
| Routes and verbs | Under api/v1; GET reads, POST writes; ids are UniqueId GUIDs |
| Success | HTTP 200 with APIResult { data, responseDescription } |
| Errors | HTTP 500 with { message, errorType, traceId }; missing privilege HTTP 401 (PrivilegeFilter) |
| Concurrency | rowVersion read with the tags must be sent on save |
| Tenant and access | Building resolved inside the caller's account and building access |

## 7. Impact analysis

| Area | Change | Affected consumers | Risk | Mitigation |
| --- | --- | --- | --- | --- |
| Modules | Portfolio only | — | Low | — |
| Integrations | None | Mobile app does not show tags | Low | Listed in section 20 |
| APIs | Two new endpoints; grid list returns a tags field | Buildings grid, export | Medium | New field is additive |
| Database | New table, two indexes | Building delete check | Low | Restrict FK; soft delete keeps rows |
| User workflows | New input on Add / Edit Building | Building editors | Low | Optional field |

## 8. Security and FedRAMP compliance

| Control (NIST 800-53 r5) | How this feature complies |
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
| CM-3 / CM-4 Change control | One reviewed EF migration; no significant change to the boundary |
| RA-5 / SA-11 Scanning and testing | No new packages; existing SAST and dependency scans cover the change |

## 9. Audit, logging and monitoring

| Event | Where logged | Fields | Purpose |
| --- | --- | --- | --- |
| Tags changed | Activity log (IActivityLogger) | User, building id, added and removed tags, time | Audit |
| Tag save failed | Application log | traceId, building id, error type (no tag text) | Diagnosis |

**Support runbook**

| Symptom | Likely cause | How to check | Resolution |
| --- | --- | --- | --- |
| Tags vanish after save | Another user saved over them | Activity log for the building | Explain concurrency; user reloads |
| Search does not find a tag | Tag has a typo or extra characters | `SELECT Tag FROM base.BuildingTags WHERE BuildingId = @id` | Correct the tag |

## 10. Performance and scalability

One extra query per building save. The grid joins tags with STRING_AGG per page of 50 rows, so cost grows with the page, not the account. Search uses the AccountId, Tag index. Load test target: grid with tag search under 1 second at 50,000 buildings and 200,000 tags.

**Caching**

| Data | Cache? | Where | Key | Expiry / invalidation | Why |
| --- | --- | --- | --- | --- | --- |
| A building's tags | No | — | — | — | Read once per form open by an index seek; caching adds invalidation work for no gain |
| Buildings grid page with tags | No | — | — | — | Results depend on keyword, sort, page and building access; hit rate would be low |
| User privileges | Yes (existing) | Platform privilege cache | AccountId + UserId | Existing rules | Already cached; the tag endpoints reuse it, nothing new |

## 11. Edge cases and failure scenarios

| Scenario | Expected behaviour | Handling |
| --- | --- | --- |
| Building saved but tag save fails | Building is saved; form shows the tag error and keeps the typed tags | Form retries on next save |
| Building soft deleted | Tags kept, hidden with the building | Same as AssetMetadata today |
| Tag with only spaces | Ignored | Trimmed on client and server |
| Unicode or emoji in a tag | Stored and shown as entered | nvarchar column |

## 12. Database design, inventory, migration and rollback

**Design**

| Choice | Decision | Reason |
| --- | --- | --- |
| Normalisation | One row per building and tag | Indexed search and a database-enforced uniqueness rule; JSON could have neither |
| AccountId on the row | Stored, although derivable from the building | Tag search filters by account without joining Buildings first |
| Data type | nvarchar(50), case-insensitive collation | Unicode tags; "Leased" and "leased" count as the same tag |
| Delete behaviour | Foreign key Restrict; building soft delete keeps tags | Matches how AssetMetadata is kept today; no Cascade |

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

**Created**

| Object | Type | Module / Schema | Purpose | Task |
| --- | --- | --- | --- | --- |
| base.BuildingTags | Table | Portfolio / base | Tags per building | Task 1 |
| UX_BuildingTags_BuildingId_Tag | Unique index | Portfolio / base | No duplicate tag per building | Task 1 |
| IX_BuildingTags_AccountId_Tag | Index | Portfolio / base | Tag search | Task 1 |
| CK_BuildingTags_Tag_NotBlank, DF_BuildingTags_AddedOn | Constraints | Portfolio / base | Blank tag guard, audit default | Task 1 |

**Altered**

None.

**Used without schema change**

| Object | Access | Columns used | Why | Task |
| --- | --- | --- | --- | --- |
| Buildings | Read | BuildingId, UniqueId, AccountId, Status | Resolve and scope the building | Task 1, 2 |
| Activity log | Write | Existing columns | Audit tag changes | Task 1 |

**Migration and rollback**

One EF migration in the Portfolio module, AddBuildingTags, applied automatically on deploy. No backfill. Rollback: the migration's Down drops the table and indexes; no other data depends on it. Verify after deploy: `SELECT COUNT(*) FROM base.BuildingTags` returns 0 without error.

## 13. Testing and regression plan

| Level | Scope | Cases (positive / negative) |
| --- | --- | --- |
| Unit | Tag normalisation | Trim, de-duplicate, length and count limits |
| Integration / API | Both endpoints | Save, replace, clear; 21 tags; stale rowVersion; View user POST |
| E2E (Playwright) | Form and grid | Add and remove tags; search finds a tag on page 2 |
| Security | Cross-tenant ids, missing privilege, input tampering | Other account's building; 401; oversized payload |
| Performance | Grid search | 50,000 buildings, 200,000 tags, under 1 second |
| Regression | Buildings grid, export, Add / Edit Building | Existing columns, search and save unchanged |

## 14. Deployment and rollback

Release backend and migration first, then the frontend. No feature flag; the column is hidden by default. Rollback: deploy the previous frontend, then the previous backend, then run the migration's Down.

## 15. End-user impact

Labels move from spreadsheets into zOne with no admin step. The input is optional and works with keyboard only (Enter to add, Backspace to remove), with labels readable by screen readers.

## 16. Risks and trade-offs

| Risk / trade-off | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Free text creates near-duplicates ("Leased", "Lease") | Medium | High | Managed tag list considered in section 20 |
| Users put contact details in tags | Medium | Low | Help text; tags reviewed as non-PII |

## 17. Decisions from review

- Tags stored in a new table, not AssetMetadata – Abhijith G, 2026-10-29

## 18. Open items

| Item | Owner | Needed by |
| --- | --- | --- |
| Confirm the 20-tag limit | Product | Before development |

## 19. Implementation brief for developers and AI agents

**Feature in one paragraph**

Users add up to 20 free-text tags (1–50 characters, unique per building, case-insensitive) to a building in Add / Edit Building. Tags are stored in base.BuildingTags, replaced in one call, shown in an optional Buildings grid column and matched by keyword search server side. Access follows PORTFOLIO_MANAGE_BUILDINGS: View reads, Manage changes.

**Codebase map**

| Layer | Path | Existing pattern to copy | What to add or change |
| --- | --- | --- | --- |
| Database | Portfolio migrations folder | An existing Portfolio EF migration | AddBuildingTags migration and entity |
| Backend API | Portfolio controllers and services | Building controller and service | Two tag endpoints, grid query join |
| Frontend | Portfolio Buildings pages | Document Hub filter chip input (V2) | Tag input on the form; Tags column |
| Tests | Playwright suite for Buildings | Existing Buildings grid spec | Cases from section 13 |

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

- [ ] All acceptance criteria in section 5 pass, positive and negative
- [ ] Section 13 tests written and green; build and lint clean
- [ ] Audit and logging in section 9 verified; section 8 controls met
- [ ] Migration applied and rolled back cleanly on a copy of production data

## 20. Future scaling and extensibility

| Topic | Today (this release) | Limit / trigger | Path forward |
| --- | --- | --- | --- |
| Data volume | Up to ~200,000 tags per account | Search slows past a few million rows | Full-text index on Tag |
| Load | One query per save, one join per grid page | None expected | — |
| Extensibility | Building only | Site or Floor tags requested | Generic EntityTags table keyed by entity type and id |
| Integrations | Web only | Mobile app or public API needs tags | Expose tags in the building API model |
| Configuration | Free text | Near-duplicate tags become common | Optional managed tag list per account |

## 21. Revision history

| Revision | Date | Author | Changes |
| --- | --- | --- | --- |
| r1 | 2026-10-29 | Abhijith G | First draft |
