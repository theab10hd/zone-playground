# <Feature Name> – Technical Requirement Document

<!-- Template for /zdev:new-trd. Keep the section order and numbering. Delete a section only when it truly does not apply, and say so in one line instead ("No database change"). Remove every guidance comment before the draft is shared. No Mermaid, images or raw HTML: the DOCX converter renders Markdown headings, paragraphs, lists, task lists, tables, code blocks and block quotes only. -->

| Item | Value |
| --- | --- |
| Feature | <one line: what the feature is> |
| Parent PRD / Work item | <link or id, or TBD> |
| Location / Path | <where it lives in the app, e.g. Portfolio > Settings > Data Fields> |
| Modules | <backend modules / frontend areas> |
| Technology | <.NET 7 · EF Core · SQL Server · React / TypeScript, as verified in the repo> |
| Type | <New Development / Enhancement / Fix> |
| Author | <name> |
| Status | Draft r1 |
| Date | <YYYY-MM-DD> |

## 1. Overview

### 1.1 Problem statement

<!-- What is wrong or missing today, who feels it, and how we know (PRD, customer, bug, data). -->

### 1.2 Business value

<!-- The outcome for customers and the business. Measurable where possible. -->

### 1.3 Scope

**In scope**

- <item>

**Out of scope**

- <item, and why or where it goes instead>

### 1.4 Glossary

| Term | Meaning |
| --- | --- |
| <term> | <meaning> |

## 2. Assumptions, dependencies and constraints

| Type | Item | Status / Owner |
| --- | --- | --- |
| Assumption | <what we take as true; must be confirmed> | Confirmed by <name> / Open |
| Dependency | <other team, module, migration, PRD sign-off> | <owner> |
| Constraint | <FedRAMP boundary, .NET version, platform page size, release window> | Fixed |

## 3. Existing system

<!-- What the code does today, verified with file:line. The closest existing feature this one follows, and what is reused unchanged. -->

| Area | Current behaviour | Reference |
| --- | --- | --- |
| <area> | <behaviour> | `<path>:<line>` |

## 4. Solution overview and key decisions

<!-- Two or three paragraphs: the shape of the solution end to end. Then one block per major decision. -->

### 4.1 Decision: <title>

| Question | Answer |
| --- | --- |
| Why this approach | <reason, tied to this codebase> |
| Alternatives considered | <option – why not> |
| Risks and trade-offs | <what we give up, what could go wrong> |
| Components impacted | <modules, tables, endpoints, screens> |
| Testing and support | <how it is tested, how support diagnoses it> |
| Edge cases and failure behaviour | <what happens when it fails or input is odd> |

## 5. Tasks

<!-- One task per independently buildable and testable unit (usually backend API, frontend, database, report). Repeat the block. -->

### Task 1 – <name>

#### Purpose

<one paragraph>

#### Data model

**New table `<schema>.<Table>`**

| Column | Type | Notes |
| --- | --- | --- |
| <Id> | int, identity | Primary key |
| UniqueId | uniqueidentifier | Public identifier used by the API |
| AccountId | uniqueidentifier | Owning account (tenant scope) |
| AddedBy / AddedOn | uniqueidentifier / datetime2 | Audit columns |
| UpdatedBy / UpdatedOn | uniqueidentifier, null / datetime2, null | Audit columns |

**Keys and indexes**

| Key / Index | Columns | Details |
| --- | --- | --- |
| Primary key | <Id> | Clustered |
| Foreign key | <col> | References <table>. On delete: Restrict |
| Unique index | AccountId, <Name> | <rule it enforces> |

**Existing tables used – no schema change**

| Table | Columns | Use |
| --- | --- | --- |
| <table> | <columns> | <use> |

#### Functional flow

<!-- Numbered steps of the real flow, with validation, edge cases, failures and messages inline where they happen. Quote exact user-facing messages. -->

1. <step>
   - <rule / validation / message>

#### API specifications

| Method | Endpoint | Privilege | Description |
| --- | --- | --- | --- |
| POST | `api/v1/<area>/list` | <PRIVILEGE (M/V)> | <short description> |

##### POST `api/v1/<area>/list`

<one or two sentences: what it does and who calls it>

Request

```json
{
  "keyword": "",
  "sortColumnId": null,
  "sortOrder": "asc"
}
```

Response – 200

```json
{
  "data": [],
  "listProperties": { "totalCount": 0, "currentStart": 1, "currentLength": 0, "pageCount": 0 },
  "responseDescription": ""
}
```

Errors

| Status | When | Message |
| --- | --- | --- |
| 401 | Missing privilege | — |
| 500 | <validation / not found / conflict> | "<exact message>" |

#### UI

<!-- Screens, V2 components reused (with the component name), states: loading, empty, error, read-only, no-permission. Grid: sort, search, filter, paging, display settings, column config. -->

#### Acceptance criteria

<!-- Positive AND negative. Each one testable, observable and unambiguous. -->

- [ ] <positive: given / when / then>
- [ ] <negative: invalid input, missing privilege, other tenant's id, concurrent edit, dependency down>

## 6. API conventions

| Topic | Convention |
| --- | --- |
| Routes and verbs | <as the platform does it, verified> |
| Paging | <start, page size> |
| Search and sort | <request model> |
| Success | <response envelope> |
| Errors | <status codes and error body> |
| Concurrency | <rowVersion rule, or n/a> |
| Tenant and access | <account scoping and privilege filter> |

## 7. Impact analysis

| Area | Change | Affected consumers | Risk | Mitigation |
| --- | --- | --- | --- | --- |
| Modules | | | | |
| Integrations | | | | |
| APIs | | | | |
| Database | | | | |
| User workflows | | | | |

## 8. Security and FedRAMP compliance

<!-- Every row must say how THIS feature meets the control, or "n/a – <reason>". -->

| Control (NIST 800-53 r5) | How this feature complies |
| --- | --- |
| AC-3 / AC-6 Access enforcement, least privilege | <privilege per endpoint and UI element> |
| AC-4 Tenant isolation | <AccountId scoping on every query, including raw SQL> |
| AU-2 / AU-3 / AU-12 Audit events | <what is audited: who, what, when, old/new values> |
| AU-9 Audit protection | <audit records not editable by the feature> |
| IA-2 Identification and authentication | <existing auth only; no new auth paths> |
| SC-8 Transmission confidentiality | <TLS 1.2+ only, no new external endpoints> |
| SC-13 Cryptographic protection | <FIPS 140 validated modules only, or n/a> |
| SC-28 Protection at rest | <encryption of new data, PII classification> |
| SC-7 Boundary protection | <no new third-party service, CDN or data flow outside the authorized boundary> |
| SI-10 Input validation | <server-side validation of every input> |
| SI-11 Error handling | <no stack traces, SQL or internals in responses; traceId only> |
| CM-3 / CM-4 Change control | <migration review, security impact analysis, significant change?> |
| RA-5 / SA-11 Scanning and testing | <SAST/dependency scan, no new unapproved packages> |

## 9. Audit, logging and monitoring

| Event | Where logged | Fields | Purpose |
| --- | --- | --- | --- |
| <event> | <activity log / change history / app log> | <user, ids, old/new, traceId> | <audit / diagnosis> |

**Support runbook**

| Symptom | Likely cause | How to check | Resolution |
| --- | --- | --- | --- |
| <symptom> | <cause> | <log query, table, endpoint> | <fix> |

## 10. Performance and scalability

<!-- Expected volumes, query count per request, paging, batch limits, load test targets. -->

**Caching**

<!-- One row per piece of data read often and changed rarely (lookups, settings, privileges, column definitions). "No cache" is a valid answer with its reason. Caches stay inside the authorized boundary (in-process memory or the platform's existing cache, never a new external service), keys always include AccountId, and PII or secrets are not cached unless the store is encrypted. -->

| Data | Cache? | Where | Key | Expiry / invalidation | Why |
| --- | --- | --- | --- | --- | --- |
| <data> | Yes / No | <in-memory / existing distributed cache / client state> | <AccountId + ...> | <TTL, cleared on save> | <read/write ratio, cost of a stale value> |

## 11. Edge cases and failure scenarios

| Scenario | Expected behaviour | Handling |
| --- | --- | --- |
| <scenario> | <behaviour the user sees> | <where in code, message, retry, rollback> |

## 12. Database design, inventory, migration and rollback

**Design**

<!-- Why the schema has this shape: normalisation, data types and lengths, nullability, defaults, delete behaviour (Restrict / No Action, never Cascade), soft delete, audit columns. Business rules the database itself must enforce go in Constraints, not only in code. -->

| Choice | Decision | Reason |
| --- | --- | --- |
| <normalisation / data type / nullability / delete behaviour> | <decision> | <reason> |

**Indexes**

<!-- Every index names the query it serves; no index without a query. Include INCLUDE columns and filtered indexes where they help. Check that an existing index does not already cover the query, and say what each index costs on writes. -->

| Index | Table | Key columns (INCLUDE) | Query it serves | Notes |
| --- | --- | --- | --- | --- |
| <IX_Table_Columns> | <schema>.<Table> | <col1, col2 (col3)> | <endpoint / grid search / delete check> | <unique, filtered, write cost> |

**Constraints**

| Constraint | Table | Type | Rule enforced |
| --- | --- | --- | --- |
| <name> | <schema>.<Table> | Primary key / Foreign key / Unique / Check / Default / Not null | <business rule> |

<!-- Every database object the feature touches, in one place, so nobody has to collect them from the tasks. Write "None" under a heading only when nothing applies. Full column lists stay in each task's Data model. -->

**Created**

| Object | Type | Module / Schema | Purpose | Task |
| --- | --- | --- | --- | --- |
| <schema>.<Table> | Table / Index / View / Stored procedure / Seed data | <module> | <why it exists> | Task <n> |

**Altered**

| Object | Change | Existing data impact | Backward compatible | Task |
| --- | --- | --- | --- | --- |
| <schema>.<Table> | <column added / index / constraint / data fix> | <rows affected, backfill> | Yes / No – <why> | Task <n> |

**Used without schema change**

| Object | Access | Columns used | Why | Task |
| --- | --- | --- | --- | --- |
| <schema>.<Table> | Read / Write / Read-Write | <columns> | <use> | Task <n> |

**Migration and rollback**

<!-- Migration name and module, order, data backfill, existing data compatibility, delete behaviour (no Cascade), how to apply (automatic or by hand), rollback script, verification query after deploy. -->

## 13. Testing and regression plan

| Level | Scope | Cases (positive / negative) |
| --- | --- | --- |
| Unit | | |
| Integration / API | | |
| E2E (Playwright) | | |
| Security | Cross-tenant ids, missing privilege, input tampering | |
| Performance | | |
| Regression | <modules that share changed code> | |

## 14. Deployment and rollback

<!-- Release order, feature flag, configuration, manual steps, verification after deploy, rollback steps. -->

## 15. End-user impact

<!-- Does the journey get simpler? Fewer clicks, clearer messages, accessibility (Section 508 / WCAG 2.1 AA), training or help text needed. -->

## 16. Risks and trade-offs

| Risk / trade-off | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| <risk> | High / Medium / Low | High / Medium / Low | <mitigation> |

## 17. Decisions from review

<!-- Every decision agreed with the developer during review, newest last, one line each with who and when. -->

- <decision> – <name>, <YYYY-MM-DD>

## 18. Open items

<!-- Anything not decided, with an owner. Empty only when nothing is open. -->

| Item | Owner | Needed by |
| --- | --- | --- |
| <item> | <owner> | <date / milestone> |

## 19. Implementation brief for developers and AI agents

<!-- This TRD is the single source for the feature: a developer or an AI agent given only this file and a one-line request must be able to build, test and support it. This section is the map; the rest of the TRD is the detail. No reference to chat, meetings or files the reader will not have. -->

**Feature in one paragraph**

<what it does, for whom, and the core rule that drives every behaviour>

**Codebase map**

| Layer | Path | Existing pattern to copy | What to add or change |
| --- | --- | --- | --- |
| Database | `<path>` | `<similar migration / entity>` | <change> |
| Backend API | `<path>` | `<similar controller / service>` | <change> |
| Frontend | `<path>` | `<similar page / V2 component>` | <change> |
| Tests | `<path>` | `<similar test>` | <change> |

**Build order**

1. <step, with the task it belongs to and how to know it is done>

**Rules that must not be broken**

- <tenant scoping, privilege checks, FedRAMP rules, no Cascade deletes, existing contracts kept, house conventions>

**Definition of done**

- [ ] All acceptance criteria in section 5 pass, positive and negative
- [ ] Section 13 tests written and green; build and lint clean
- [ ] Audit and logging in section 9 verified; section 8 controls met
- [ ] Migration applied and rolled back cleanly on a copy of production data

## 20. Future scaling and extensibility

<!-- How the design grows. Be specific to this feature and honest about limits. -->

| Topic | Today (this release) | Limit / trigger | Path forward |
| --- | --- | --- | --- |
| Data volume | <expected rows, tenants> | <where it slows down> | <partitioning, archiving, index, summary table> |
| Load | <requests per user action> | <concurrency limit> | <caching, async jobs, batching> |
| Extensibility | <entities / modules covered> | <what is not covered> | <how to add the next entity without schema change> |
| Integrations | <none / existing> | <future consumers: reports, mobile, API clients> | <contract or event to expose> |
| Configuration | <hard-coded rules> | <when customers need variation> | <setting, data field, feature flag> |

## 21. Revision history

| Revision | Date | Author | Changes |
| --- | --- | --- | --- |
| r1 | <YYYY-MM-DD> | <name> | First draft |
