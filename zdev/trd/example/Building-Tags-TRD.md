# Building Tags – Technical Requirement Document

> Example only. This TRD shows the shape and depth /zdev:new-trd produces. Paths, names and figures are illustrative and were not checked against the zOne code.

## Summary

Facility managers can add short free-text labels, such as "HVAC-2024" or "Leased", to a building and then find buildings by those labels in the Buildings grid. Today they keep these labels in spreadsheets, because zOne has no light-weight label on a building and creating a data field for each label needs an administrator. Tags keep the labels in zOne, searchable in one step, with no administrator work.

**Scope**

- Add and remove up to 20 tags on a building from Add / Edit Building.
- An optional Tags column in the Buildings grid, included in keyword search.
- Out of scope: tags on Site, Floor or other records, bulk tagging and import, and tag colours or a managed tag list.

**Key decisions**

| # | Decision (one line) | Explained in |
| --- | --- | --- |
| D1 | Tags are stored in their own table, not in the building's custom-field store | Section 4.1 |
| D2 | Tags apply to buildings only in this release, built so other records can be added later | Section 4.2 |
| D3 | Tags are free text, case-insensitive, with no managed list of allowed tags | Section 4.3 |
| D4 | Saving replaces a building's whole tag list at once, all or nothing, with a check for another user's change | Section 4.4 |
| D5 | Access reuses the existing building privilege: View reads tags, Manage changes them | Section 4.5 |
| D6 | Search finds tags that contain the keyword, on the server, with no cache | Section 4.6 |
| D7 | Release without a feature flag; the Tags column is hidden by default | Section 4.7 |

## Status, owners and open decisions

| Item | Value |
| --- | --- |
| Feature | Free-text tags on buildings, shown and searchable in the Buildings grid |
| Parent PRD / Work item | Task 18400 (example) |
| Location in the app | Portfolio > Buildings grid; Add / Edit Building |
| Type | New Development |
| Author | Abhijith G |
| Reviewers / sign-off | TBD |
| Status | Draft r2 |
| Date | 2026-11-02 |

**Open decisions** (awaiting sign-off; nothing here is a settled requirement)

| # | Decision needed | Options | Owner | Needed by |
| --- | --- | --- | --- | --- |
| O1 | Confirm the limit of 20 tags per building | Keep 20 (current assumption, recommended) / a different limit | Product | Before development |
| O2 | Confirm that tag colours (PRD requirement R5) are not delivered this release | Defer to a later release (current plan) / include now | Product | Before development |

## 1. Problem and goals

Facility managers label buildings with ad-hoc attributes, such as a survey year or a lease status. zOne has no light-weight label on a building, so they keep these labels in spreadsheets. To find a group of buildings they export the grid to Excel and filter it there, which takes six or more steps.

The only way to label a building in zOne today is to ask an administrator to create a data field. That is slow for one-off labels and clutters the Add / Edit Building form. Labels kept outside zOne also break search and reporting.

This feature lets any building editor add short tags and lets every building viewer find buildings by tag in one search.

**Goals**

- Users find a group of buildings in one search instead of exporting to Excel (six or more steps down to one).
- No administrator involvement for one-off labels.
- Tag search returns in under 1 second for an account with 50,000 buildings.

## 2. Concepts

A **tag** is a short label, 1 to 50 characters, attached to one building. A building can have up to 20 tags. Tags are compared without regard to case or surrounding spaces, so "Leased" and " leased " are the same tag and are stored once.

Running example: building 1042 has no tags. An editor adds "HVAC-2024" and "Leased" and saves. Later the editor removes "HVAC-2024", adds "Roof-Survey", and also types "leased " by mistake. On save, "leased " is merged into the existing "Leased", so the building ends with "Leased" and "Roof-Survey". The change history records "Added: Roof-Survey; Removed: HVAC-2024".

Each time a user opens a building's tags, they also receive a **version stamp**. The save sends it back. If another user saved the tags in the meantime, the stamps differ and the save is refused, so no one overwrites another person's change without seeing it.

| Name | What it is | Example |
| --- | --- | --- |
| Tag | A short free-text label on one building | HVAC-2024 |
| Tag list | All tags of one building, saved together | Leased, Roof-Survey |
| Version stamp | A value that changes every time a building's tags are saved | Changes on each save |
| Tags column | Optional grid column showing a building's tags | HVAC-2024, Leased |
| Keyword search | The existing Buildings grid search box, now also matching tags | "HVAC" finds "HVAC-2024" |

The full glossary and identifier formats are in Appendix H.

## 3. Scope

**In scope**

- Add and remove up to 20 tags on a building from Add / Edit Building.
- A Tags column in the Buildings grid, available in Display Settings and hidden by default.
- Keyword search in the Buildings grid includes tags, across the user's full list of buildings.
- A record of every tag change in the activity log.

**Out of scope**

- Tags on Site, Floor or other records; the design allows this later (section 4.2).
- Bulk tagging and import of tags.
- Tag colours or a managed tag list (section 4.3).
- Sorting the grid by Tags; a column with several values per row cannot be sorted meaningfully.
- Showing tags in the mobile app or the public building API; a later release can add them (Appendix E).

**Approved deviations from the PRD**

None approved. Tag colours (PRD requirement R5) are not delivered this release; that is awaiting sign-off as open decision O2.

The full mapping of every PRD requirement to this TRD is in Appendix I.

## 4. Key design decisions

### 4.1 Tags in their own table

| | |
| --- | --- |
| Options considered | A – store tags in the building's existing custom-field store (AssetMetadata): no database change, but slow search and no rule against duplicates. B – a new data field type: needs administrator setup in every account, which the PRD rejects. C – a new table with one row per building and tag |
| Choice | C, a new table. Approved by Abhijith G on 2026-10-29 |
| Why | A table can be indexed, so tag search stays fast; searching the custom-field store reads every building's data. The table also lets the database refuse a duplicate tag on a building |
| Trade-off | One more table and database change to maintain; tags are not part of the general data field engine |
| Detail | Appendix A |

### 4.2 Buildings only, open to other records later

| | |
| --- | --- |
| Options considered | A – a table for building tags only. B – a general table that tags any type of record |
| Choice | A, building tags only |
| Why | Only building tags are requested. If Site or Floor tags are requested later, a general table can be added and the existing rows copied into it, while the building screens keep working unchanged |
| Trade-off | Extending to other records later needs a data move |
| Detail | Appendix E |

### 4.3 Free text, no managed tag list

| | |
| --- | --- |
| Options considered | A – free text typed by the user. B – a managed list of allowed tags per account |
| Choice | A, free text, compared without regard to case |
| Why | Users label buildings without an administrator, which is the goal of the feature |
| Trade-off | Users may create near-duplicates such as "Leased" and "Lease", so a search can miss buildings (section 8). A managed list per account can be added later as a setting if this becomes common |
| Detail | Appendix E |

### 4.4 Save the whole tag list at once

| | |
| --- | --- |
| Options considered | Only one option is recorded: the form sends the building's full tag list, which replaces the stored list |
| Choice | Replace the whole list in one step, after the building itself is saved, checking the version stamp (section 2) |
| Why | One step keeps the stored tags exactly as the user saw them. If any rule fails (too many tags, a tag too long, another user's change), nothing is written |
| Trade-off | If the building saves but the tags do not, the user sees the tag error, keeps the typed tags and saves again |
| Detail | Appendix B |

### 4.5 Access through the existing building privilege

| | |
| --- | --- |
| Options considered | Only one option is recorded: reuse the building privilege that already controls building data |
| Choice | View users read tags; Manage users add and remove them (section 6) |
| Why | Tags are building data and are visible to the same people as other building fields. No new privilege for administrators to assign |
| Trade-off | Tags cannot be restricted separately from other building fields |
| Detail | Appendix J |

### 4.6 Search on the server, no cache

| | |
| --- | --- |
| Options considered | A – a "contains" search over the account's tags, helped by a narrow index. B – a full-text index. For caching: cache tags and grid pages, or no cache |
| Choice | A, with no cache. Search runs on the server across the user's full list, not only the page shown |
| Why | A narrow index keeps search under 1 second at today's largest volume. A building's tags are read once per form open by a fast lookup, and grid results depend on keyword, sort, page and access, so a cache would rarely be reused and would need clearing on every save |
| Trade-off | At ten times today's largest volume the search becomes slow first; the full-text index is then the path forward (section 7) |
| Detail | Appendices A and E |

### 4.7 No feature flag, column hidden by default

| | |
| --- | --- |
| Options considered | A – release behind a feature flag. B – release directly, with the Tags column hidden by default |
| Choice | B, no feature flag |
| Why | The tag input is optional and the column only appears when a user turns it on, so existing screens look and behave as before |
| Trade-off | Turning the feature off means rolling back the release; tags entered since go-live are then lost (section 10) |
| Detail | Appendix A (migration) |

## 5. User flow

```text
Editor ──> Add / Edit Building ──> types tags ──> saves ──> tags stored and logged
                                                                   │
Viewer ──> Buildings grid ──> shows Tags column ──> searches ──> matching buildings
```

1. An editor opens Add / Edit Building, types a tag and presses Enter. The tag appears as a chip. Empty input is ignored, a duplicate is not added twice, and a tag over 50 characters shows an error.
2. The editor saves. The building saves first, then its tags. Over 20 tags, or another user's change in the meantime, shows an error and changes no tags.
3. The tag change is recorded in the activity log with who, when, and the tags added and removed.
4. Any user who can see the building turns on the Tags column in Display Settings. The column lists tags separated by commas, and after three tags it is cut off with the rest in a tooltip. The choice is kept.
5. The user types a keyword in the grid search. Buildings whose tags contain the keyword appear, from any page of the list.

Screen detail is in Appendix K.

## 6. Access and visibility rules

| Role / privilege | Can see | Can change |
| --- | --- | --- |
| PORTFOLIO_MANAGE_BUILDINGS (V) | Tags column in the grid; tag chips on the form, read only | Nothing |
| PORTFOLIO_MANAGE_BUILDINGS (M) | Same as View | Add and remove tags |

Tags are visible to anyone who can view the building, the same as other building fields. A user only reaches buildings in their own account and within their building access. The server enforces every rule above; the screen only hides what the user cannot use.

## 7. Non-functional requirements

**Security and compliance** (full control mapping: Appendix J)

- No new external service, package or data flow; stays inside the FedRAMP boundary and uses the existing sign-in and logging.
- Every limit (length, count, trimming) is checked on the server, not only in the form.
- Abuse or exposure: a user cannot read or change another account's tags or bypass the privilege. A user could type personal data into a tag; help text says tags are not for personal data, and product confirmed tags are not personal data.

**Audit**

- Every tag change is recorded with the user, time, building, and the tags added and removed.
- Failed saves are logged for diagnosis without the tag text.

**Performance and volume**

- Expected volume: up to 50,000 buildings and 200,000 tags in a large account; at most 20 tags per save.
- Target: keyword search with tags returns in under 1 second at that volume.
- One extra step per building save; the grid adds tags only for the page shown (50 rows).
- No new cache (section 4.6); the existing privilege cache is reused.
- At ten times the volume (2 million tags per account) the search slows first; the path forward is a full-text index.

**Supportability** (logs, alerts and runbook: Appendix G)

- Support checks the building's activity log and the error trace id. Operational owner: Portfolio team.
- Tag save failures are expected under 1% of saves; the existing API error-rate alert covers the feature.

**Usability and accessibility**

- Finding labelled buildings goes from six or more steps (export and filter) to one (type in grid search).
- Error messages state the limit with its number, for example "at most 20 tags".
- Keyboard only: Enter adds a tag, Backspace removes one; chips are read by screen readers (Section 508 / WCAG 2.1 AA).

## 8. Risks and dependencies

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Free text creates near-duplicates ("Leased", "Lease") and search misses buildings | Medium | High | Managed tag list as a later option (section 4.3) |
| Users put contact details in tags, creating unplanned personal data | Medium | Low | Help text; tags reviewed as non-personal data |
| Large data volume slows tag search | Medium | Low | Narrow index now; full-text index at ten times the volume |
| Grid list and export receive a new tags field | Medium | Low | The field is added without changing existing fields |

**Dependencies** (named here, specified by their owners)

| Dependency | Owner | Needed for |
| --- | --- | --- |
| Buildings grid Display Settings support a new column | Portfolio team | Tags column |

**Assumptions**

- Tags are not personal data, and the screen says so in help text. Confirmed by product.
- 20 tags per building is enough. Open (O1).

**Constraints**

- FedRAMP boundary: no new external service; existing sign-in and logging only. Fixed.
- The platform grid page size of 50 rows. Fixed.

## 9. Acceptance criteria

**Saving tags**

| # | Criterion | Tests |
| --- | --- | --- |
| AC1 | When an editor saves 1 to 20 tags, they are stored and shown again in the order they were added | F-1, F-2, F-10 |
| AC2 | "Leased" and " leased " on the same building are stored once | F-1, F-3 |
| AC3 | A tag of only spaces is ignored | F-1 |
| AC4 | Saving with no tags removes every tag from the building | F-3 |
| AC5 | Saving 21 tags fails with "A building can have at most 20 tags" and leaves the old tags unchanged | F-1, F-4 |
| AC6 | A tag over 50 characters fails with "A tag can have at most 50 characters" | F-1, F-5 |
| AC7 | When another user saved the tags first, the save fails with "This record was changed by another user. Reload and try again" | F-6, F-19 |
| AC8 | When the building saves but the tags fail, the building is kept, the error shows and the typed tags stay in the form | F-14 |
| AC9 | Tags with accents or emoji are stored and shown as typed | F-15 |
| AC10 | Each tag change appears in the building's activity log with the tags added and removed | F-2 |
| AC11 | A deleted building keeps its tags, hidden with the building | F-16 |

**Grid and search**

| # | Criterion | Tests |
| --- | --- | --- |
| AC12 | Searching "HVAC" finds a building tagged "HVAC-2024" on any page of the grid | F-11 |
| AC13 | The Tags column can be shown and hidden in Display Settings, and the choice is kept | F-12 |
| AC14 | Search with tags returns in under 1 second for 50,000 buildings and 200,000 tags | F-18 |
| AC15 | Existing grid columns, search, export and building save behave as before | F-17 |

**Access**

| # | Criterion | Tests |
| --- | --- | --- |
| AC16 | A View user sees tag chips but no add or remove controls | F-13 |
| AC17 | A View user who tries to save tags is refused | F-7 |
| AC18 | A building from another account is reported as "Building not found" | F-8 |
| AC19 | An oversized tag list is refused before anything is written | F-9 |

## 10. Rollout and rollback

| Topic | Plan |
| --- | --- |
| Feature flag | None – the input is optional and the Tags column is hidden by default (section 4.7) |
| Deployment order | Backend with the database change first, then frontend. No downtime; no point of no return |
| Go / no-go checkpoint | The new table exists after the backend deploy, before the frontend is deployed |
| Post-deployment checks | Add, search for and remove a tag on a test building; check the activity log entry; then tell pilot users |
| Rollback | Previous frontend, then previous backend, then undo the database change. Tags entered since go-live are lost |

---

## Appendix A – Database schema and migration

**Why each change is required**

New storage is required because AssetMetadata JSON cannot be indexed for tag search or enforce one tag per building.

| Object | Change | Module / schema | Why required | Existing data impact | Backward compatible |
| --- | --- | --- | --- | --- | --- |
| base.BuildingTags | New table | Portfolio / base | Tags per building | None – new table | Yes – nothing existing changes |
| UX_BuildingTags_BuildingId_Tag | New unique index | Portfolio / base | No duplicate tag per building | None | Yes |
| IX_BuildingTags_AccountId_Tag | New index | Portfolio / base | Tag search | None | Yes |
| CK_BuildingTags_Tag_NotBlank, DF_BuildingTags_AddedOn | New constraints | Portfolio / base | Blank tag guard, audit default | None | Yes |

Modified tables and columns added: none.

**New table `base.BuildingTags`**

| Column | Type | Notes |
| --- | --- | --- |
| BuildingTagId | int, identity | Primary key |
| BuildingId | int | The tagged building |
| AccountId | uniqueidentifier | Owning account (tenant scope) |
| Tag | nvarchar(50) | Trimmed text as entered |
| AddedBy / AddedOn | uniqueidentifier / datetime2 | Audit columns |

**Design choices**

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

**Used without schema change**

| Object | Access | Columns used | Why |
| --- | --- | --- | --- |
| Buildings | Read | BuildingId, UniqueId, AccountId, Status | Resolve and scope the building |
| Activity log | Write | Existing columns | Audit tag changes |

**Data flow samples**

| Scenario | Table | Column | Before | After |
| --- | --- | --- | --- | --- |
| Add tags to an untagged building | base.BuildingTags | Tag (BuildingId 1042) | — | HVAC-2024 |
| Add tags to an untagged building | base.BuildingTags | Tag (BuildingId 1042) | — | Leased |
| Replace tags, with a duplicate in different case | base.BuildingTags | Tag (BuildingId 1042) | HVAC-2024, Leased | Leased, Roof-Survey |
| Replace tags, with a duplicate in different case | Activity log | Details | — | Added: Roof-Survey; Removed: HVAC-2024 |

In the replace scenario the request sent is `["Leased", "leased ", "Roof-Survey"]`; "leased " is merged into "Leased".

**Migration**

| Topic | Plan |
| --- | --- |
| Schema migration | EF migration AddBuildingTags in the Portfolio module, applied automatically on deploy |
| Data migration | None – no existing data |
| Validation | The query below returns 0 without error after deploy |
| Rollback | The migration's Down drops the table and indexes; tags entered since go-live are lost |

```sql
SELECT COUNT(*) FROM base.BuildingTags
```

## Appendix B – API contracts and payload examples

**Conventions**

| Topic | Convention |
| --- | --- |
| Routes and verbs | Under api/v1; GET reads, POST writes; ids are UniqueId GUIDs |
| Authentication | Existing session authentication; no new auth path |
| Paging, search and sort | Existing server-side grid paging, 50 rows (PAGE_COUNT), total count unchanged; keyword search includes tags; no sort on Tags |
| Success / errors | HTTP 200 with APIResult { data, responseDescription }; errors HTTP 500 with { message, errorType, traceId }; missing privilege HTTP 401 (PrivilegeFilter) |
| Concurrency | rowVersion read with the tags must be sent on save |
| Tenant and access | Building resolved inside the caller's account and building access; privileges per section 6 |
| Backward compatibility | New endpoints; the grid list response gains an additive tags field, used by the Buildings grid and export |

**Endpoints**

| Method | Endpoint | Privilege | Description |
| --- | --- | --- | --- |
| GET | `api/v1/portfolio/buildings/{buildingId:Guid}/tags` | Signed-in user, PORTFOLIO_MANAGE_BUILDINGS (V) | List a building's tags |
| POST | `api/v1/portfolio/buildings/{buildingId:Guid}/tags` | Signed-in user, PORTFOLIO_MANAGE_BUILDINGS (M) | Replace a building's tags |

### GET `api/v1/portfolio/buildings/{buildingId:Guid}/tags`

Returns the building's tags in the order they were added, with the row version used for the next save. Existing session; View or Manage; the building must be in the caller's account and building access.

Response – 200

```json
{
  "data": { "tags": ["HVAC-2024", "Leased"], "rowVersion": "AAAAAAAAB9E=" },
  "responseDescription": ""
}
```

### POST `api/v1/portfolio/buildings/{buildingId:Guid}/tags`

Replaces all tags of the building; sending an empty list removes every tag. The form calls it after the building save succeeds. Existing session; Manage; the building must be in the caller's account and building access.

The controller checks the privilege and the building's account and access. The service trims and de-duplicates tags, checks the limits and the rowVersion, replaces the rows in one transaction and writes one activity log entry with the added and removed tags.

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
  "data": {
    "tags": ["HVAC-2024", "Leased", "Roof-Survey"],
    "rowVersion": "AAAAAAAAB+A="
  },
  "responseDescription": "Tags saved"
}
```

Validation, in order

| Step | Field | Rule | Message |
| --- | --- | --- | --- |
| 1 | tags | Required list, at most 20 items after de-duplication | "A building can have at most 20 tags" |
| 2 | tags[] | Trimmed, 1–50 characters; blank items ignored | "A tag can have at most 50 characters" |
| 3 | rowVersion | Required; must match the current value | "This record was changed by another user. Reload and try again" |

Errors

| Status | When | Message |
| --- | --- | --- |
| 401 | Missing privilege | — |
| 500 | More than 20 tags | "A building can have at most 20 tags" |
| 500 | A tag over 50 characters | "A tag can have at most 50 characters" |
| 500 | Building not in the caller's account or building access | "Building not found" |
| 500 | Stale rowVersion | "This record was changed by another user. Reload and try again" |

## Appendix C – Configuration and stored data formats

None. Tags are plain table rows; the feature stores no JSON or other structured format and adds no feature flag or configuration key.

## Appendix D – Reports, procedures and calculations

None. No new report or stored procedure; the existing grid list and export only receive the additive tags field (Appendix B), built with STRING_AGG per page (Appendix E).

## Appendix E – Code map

Modules: Portfolio (backend), Portfolio Buildings (frontend). Technology: .NET 7 · EF Core · SQL Server · React / TypeScript.

**Existing system**

| Area | Current behaviour | Component | Reference |
| --- | --- | --- | --- |
| Building save | Add / Edit Building posts the whole building model; custom fields go to AssetMetadata JSON | BuildingController | `BuildingController.cs` (example) |
| Buildings grid | Keyword search runs in SQL over name, code and address | BuildingService.GetList | `BuildingService.cs` (example) |
| Audit | Building changes are recorded through IChangesetTrackable | Building entity | `Building.cs` (example) |

Existing limitations: no way to label a building without an administrator creating a data field; searching AssetMetadata JSON scans every building's metadata, so a JSON-based label would be slow to search.

**Architecture**

Tags are stored in a new table keyed by building, saved through a dedicated endpoint in the existing Portfolio controller → service → repository layers, and joined into the existing grid query for display and search. The Add / Edit Building form gets a tag input built from the existing V2 chip component.

| Component | Responsibility | Talks to |
| --- | --- | --- |
| Tag input (frontend) | Collect and validate tags in the form | Building tags API |
| BuildingTagsController | Route, privilege check, request validation | BuildingTagService |
| BuildingTagService | Normalise tags, enforce limits, replace in one transaction, audit | BuildingTags repository, activity log |
| BuildingService.GetList | Grid list and keyword search, now including tags | base.BuildingTags |

```text
User ──> Add / Edit Building ──> POST .../buildings/{id}/tags
                                    │
                    BuildingTagsController (privilege, validation)
                                    │
                    BuildingTagService ──> base.BuildingTags (replace)
                                    │
                                    └──> Activity log (added / removed)
```

Query impact: one extra query per building save; the grid joins tags with STRING_AGG per page of 50 rows.

**What changes**

| Layer | Path | Existing pattern to copy | What to add or change |
| --- | --- | --- | --- |
| Database | Portfolio migrations folder | An existing Portfolio EF migration | AddBuildingTags migration and entity |
| Backend API | Portfolio controllers and services | Building controller and service | Two tag endpoints, grid query join |
| Frontend | Portfolio Buildings pages | Document Hub filter chip input (V2) | Tag input on the form; Tags column |
| Tests | Playwright suite for Buildings | Existing Buildings grid spec | Cases from Appendix F |

**Impact on existing code**

| Area | Change | Affected consumers | Risk | Mitigation |
| --- | --- | --- | --- | --- |
| Modules | Portfolio only | — | Low | — |
| Integrations | None | Mobile app does not show tags | Low | Listed under future extensibility below |
| APIs | Two new endpoints; grid list returns a tags field | Buildings grid, export | Medium | New field is additive |
| Database | New table, two indexes | Building delete check | Low | Restrict FK; soft delete keeps rows |
| User workflows | New input on Add / Edit Building | Building editors | Low | Optional field |

**Design principles**

| Area | Answer |
| --- | --- |
| Architecture alignment | Uses the existing controller → service → repository layers, privilege filter and activity log; one small table, no new framework |
| SOLID | Single responsibility: the tag service owns normalisation and limits only. Dependency inversion: the service depends on a repository interface, so it is unit-testable. Open/closed: a later EntityTags table extends without changing callers |
| Scalability | Holds up to ~2 million tags per account (section 7) |

**Future scaling and extensibility**

| Topic | Today (this release) | Limit / trigger | Path forward |
| --- | --- | --- | --- |
| Data volume | Up to ~200,000 tags per account | Search slows past a few million rows | Full-text index on Tag |
| Load | One query per save, one join per grid page | None expected | — |
| Extensibility | Building only | Site or Floor tags requested | Generic EntityTags table keyed by entity type and id |
| Integrations | Web only | Mobile app or public API needs tags | Expose tags in the building API model |
| Configuration | Free text | Near-duplicate tags become common | Optional managed tag list per account (configuration, not custom code) |
| Backward compatibility and upgrades | Additive endpoints and field | Moving to EntityTags | Copy rows in a migration; keep the building endpoints as a facade |

**Build order**

1. Migration and entity; done when the table exists locally.
2. Tag endpoints with validation and audit; done when the saving and access acceptance criteria (AC1–AC11, AC17–AC19) pass.
3. Grid column and search.
4. Form tag input; done when the E2E cases pass.

**Rules that must not be broken**

- Every query scoped by AccountId and building access.
- Validation on the server; the form only mirrors it.
- Restrict foreign key, never Cascade.
- No new package or external service.

**Definition of done**

- [ ] Every acceptance criterion in section 9 passes, with its Appendix F tests green
- [ ] Build and lint clean; Appendix G logging verified; Appendix J controls met
- [ ] Migration applied and rolled back cleanly on a copy of production data

## Appendix F – Test matrix

| Test | Level | Scenario | Expected result | Covers |
| --- | --- | --- | --- | --- |
| F-1 | Unit | Tag normalisation: trim, de-duplicate, length and count limits, blank items | Trimmed, merged, blanks ignored; limits rejected | AC1, AC2, AC3, AC5, AC6 |
| F-2 | API | Save 1 to 20 tags, then GET | Stored, returned in order added; one activity log entry with added / removed tags | AC1, AC10 |
| F-3 | API | Replace tags with a case duplicate; save an empty list | Duplicate stored once; empty list removes all tags | AC2, AC4 |
| F-4 | API | Save 21 tags | Limit message; old tags unchanged | AC5 |
| F-5 | API | Save a 51-character tag | Length message; nothing written | AC6 |
| F-6 | API | Save with a stale rowVersion | Concurrency message; nothing written | AC7 |
| F-7 | Security | View-only user calls POST | 401 | AC17 |
| F-8 | Security | Another account's building id on GET and POST | "Building not found" | AC18 |
| F-9 | Security | Oversized or tampered payload | Rejected before any write (20 tags × 50 characters) | AC19 |
| F-10 | E2E (Playwright) | Add and remove tags on the form | Chips added and removed; saved tags shown on reopen | AC1 |
| F-11 | E2E (Playwright) | Grid search for "HVAC" with the tagged building on page 2 | Building found | AC12 |
| F-12 | E2E (Playwright) | Show and hide the Tags column in Display Settings | Choice kept | AC13 |
| F-13 | E2E (Playwright) | View user opens the form | Read-only chips; no add or remove controls | AC16 |
| F-14 | E2E (Playwright) | Building save succeeds, tag save fails | Building saved; tag error shown; typed tags kept | AC8 |
| F-15 | API | Tag with accents or emoji | Stored and shown as entered | AC9 |
| F-16 | API | Soft-delete a tagged building | Tags kept, hidden with the building | AC11 |
| F-17 | Regression | Buildings grid, export, Add / Edit Building | Existing columns, search and save unchanged | AC15 |
| F-18 | Performance | Grid search at 50,000 buildings, 200,000 tags | Under 1 second | AC14 |
| F-19 | UAT | Two facility managers from the pilot account tag 20 buildings, search, and edit tags concurrently | Tags and search work; the second concurrent save gets the concurrency message | AC7, AC12 |

**Edge cases and failures** (every one has a test above)

| Scenario | Expected behaviour | Handling | Test |
| --- | --- | --- | --- |
| Building saved but tag save fails | Building is saved; form shows the tag error and keeps the typed tags | Form retries on next save | F-14 |
| Two users save tags at the same time | Second save fails with the concurrency message | rowVersion check in the service | F-6, F-19 |
| Building soft deleted | Tags kept, hidden with the building | Same as AssetMetadata today | F-16 |
| Tag with only spaces | Ignored | Trimmed on client and server | F-1 |
| Unicode or emoji in a tag | Stored and shown as entered | nvarchar column | F-15 |

**Security tests**

| Case | Expected result | Test |
| --- | --- | --- |
| Other account's building id | "Building not found" | F-8 |
| Missing privilege (View user POST) | 401 | F-7 |
| Input tampering, oversized payload | Rejected before any write | F-9 |

## Appendix G – Monitoring and runbook

**Logs**

| Event | Where logged | Fields (no PII or secrets) | Purpose |
| --- | --- | --- | --- |
| Tags changed | Activity log (IActivityLogger) | User, building id, added and removed tags, time | Audit |
| Tag save failed | Application log | traceId, building id, error type (no tag text) | Diagnosis |

**Metrics and alerts**

| Metric or alert | Source | Normal range / condition | Who is notified |
| --- | --- | --- | --- |
| Tag save failures per hour | Existing application monitoring | Under 1% of saves | — |
| Grid list duration with a keyword | Existing request timing | Under 1 second | — |
| No new alert – the existing API error-rate alert covers the new endpoints | Existing monitoring | — | — |

**Runbook**

| Symptom | Likely cause | How to check | Resolution |
| --- | --- | --- | --- |
| Tags vanish after save | Another user saved over them | Activity log for the building | Explain concurrency; user reloads |
| Search does not find a tag | Tag has a typo or extra characters | Query below | Correct the tag |

```sql
SELECT Tag FROM base.BuildingTags WHERE BuildingId = @id
```

Operational owner: Portfolio team.

## Appendix H – Glossary and identifier rules

| Term | Meaning |
| --- | --- |
| Tag | A short free-text label, 1–50 characters, attached to one building |
| AssetMetadata | The building's existing JSON store for custom data fields |
| rowVersion | The version stamp returned with a building's tags and sent back on save |
| PAGE_COUNT | Platform grid page size, 50 rows |

| Identifier | Format | Where it is used | Example |
| --- | --- | --- | --- |
| buildingId | UniqueId GUID | API route | `{buildingId:Guid}` |
| BuildingId | int | base.BuildingTags foreign key to Buildings | 1042 |
| BuildingTagId | int, identity | base.BuildingTags primary key | — |
| rowVersion | Base64 string | Tag GET response and POST request | AAAAAAAAB9E= |

## Appendix I – Requirement mapping

| ID | PRD requirement | How it is delivered | Section | Comments |
| --- | --- | --- | --- | --- |
| R1 | Users can tag a building | New table base.BuildingTags and tag endpoints | 4.1, 4.4, AC1–AC11 | Up to 20 tags (assumed, open decision O1) |
| R2 | Tags show in the Buildings grid | Tags column, hidden by default, in Display Settings | 5, AC13 | — |
| R3 | Users can search by tag | Grid keyword search includes tags, server side | 4.6, AC12, AC14 | Contains match |
| R4 | Only editors change tags | PORTFOLIO_MANAGE_BUILDINGS (M) on save | 4.5, 6, AC16–AC17 | View users see tags read-only |
| R5 | Tag colours | — | 3, O2 | Not delivered – out of scope this release |

## Appendix J – Security and FedRAMP control mapping

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

| Case | Possible? | Prevention |
| --- | --- | --- |
| Read or change another account's tags by guessing ids | No | Building resolved inside the caller's account and building access |
| View user changes tags | No | Manage privilege on POST |
| Storing personal data in tags | Yes, by user choice | Help text; tags are short and visible to all building viewers |
| Oversized payload to exhaust the database | No | 20 tags × 50 characters enforced before any write |

**NIST 800-53 r5 / FedRAMP controls**

| Control | How this feature complies |
| --- | --- |
| AC-3 / AC-6 Access enforcement, least privilege | View can read, Manage can change, via the existing PORTFOLIO_MANAGE_BUILDINGS privilege (section 6) |
| AC-4 Tenant isolation | Every query filters by AccountId and the user's building access |
| AU-2 / AU-3 / AU-12 Audit events | Tag changes logged with user, time, building and added / removed tags |
| AU-9 Audit protection | Activity log is append-only; the feature has no delete on it |
| IA-2 Identification and authentication | Existing authentication only |
| SC-7 Boundary protection | No new service, package source or data flow outside the boundary |
| SC-8 Transmission confidentiality | Existing TLS 1.2+ endpoints; no new external call |
| SC-13 Cryptographic protection | n/a – no new cryptography |
| SC-28 Protection at rest | Stored in the existing encrypted database; tags are not PII |
| SI-10 Input validation | Length, count and trimming enforced on the server, not only in the form |
| SI-11 Error handling | Business messages and traceId only; no SQL or stack trace returned |
| SI-12 Information retention | Follows the building's existing retention |
| CM-3 / CM-4 Change control | One reviewed EF migration; no significant change to the boundary |
| RA-5 / SA-11 Scanning and testing | No new packages; existing SAST and dependency scans cover the change |

## Appendix K – Screens and field rules

Screens and fields: PRD section 3 and the Figma Building Tags frames (example).

### Add / Edit Building – tag input

Built from the existing V2 chip input, as used on Document Hub filters (example). Enter adds a tag, Backspace removes one. States: read-only chips for View users; error text under the input; help text saying tags are not for personal data.

| Field / action | Validation rule | Error message |
| --- | --- | --- |
| Tag input | 1–50 characters after trimming; empty input ignored; a tag already on the building (any case) is not added twice | "A tag can have at most 50 characters" |
| Add tag | At most 20 per building | "A building can have at most 20 tags" |
| Save | Tags saved after the building; stale version refused | "This record was changed by another user. Reload and try again" |

### Buildings grid – Tags column

Comma-separated tags, cut off with a tooltip after 3 tags. Available in Display Settings, hidden by default. Not sortable (multi-value column). Keyword search matches buildings whose tags contain the keyword, across the full authorized list, server side.

## Appendix L – TRD design checklist

- [x] Problem, goals, scope and out of scope clear to a non-technical reader
- [x] Every PRD requirement mapped (Appendix I); deviations approved or listed as open decisions
- [x] Every key decision has options, choice and trade-off, and appears in the Summary table
- [x] Reuse of existing components evaluated; no needless complexity or new debt
- [x] Access rules stated once (section 6) and enforced on the server
- [x] Happy path, errors, edge cases and concurrency covered and tested (Appendix F)
- [x] Data model, indexes, constraints, retention and migration documented (Appendix A)
- [x] API contracts, validation, errors and backward compatibility documented (Appendix B)
- [x] Authentication, authorization, sensitive data, audit and FedRAMP reviewed (Appendix J)
- [x] Volume, query performance, pagination and 10x growth considered
- [x] Logging, alerts, runbook and owner defined (Appendix G)
- [ ] Rollout, go / no-go, post-deployment checks and data-keeping rollback defined – rollback loses tags entered since go-live (section 10)
- [x] Discoverability, error messages, accessibility and click count reviewed
- [ ] Regulatory or organisational compliance requirements reviewed – example only; no regulatory source supplied

## Revision history

| Revision | Date | Author | Changes |
| --- | --- | --- | --- |
| r1 | 2026-10-30 | Abhijith G | First draft. Review decision: tags stored in a new table, not AssetMetadata – Abhijith G, 2026-10-29 |
| r2 | 2026-11-02 | Abhijith G | Restructured: short main body with decisions, scope and acceptance criteria; technical detail moved to appendices |
