# <Feature Name> – Technical Requirement Document

<!-- Template for /zdev:new-trd. Keep the section order and numbering. Delete a section only when it truly does not apply, and say so in one line instead ("No database change"). Remove every guidance comment before the draft is shared. No Mermaid or raw HTML: the DOCX converter renders Markdown headings, paragraphs, lists, task lists, tables, code blocks, block quotes and local PNG/JPG images (Figma snapshots, `![caption](images/<file>.png)` relative to this file) only. Diagrams are plain-text drawings inside a code block. -->

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

<!-- Describe the feature in simple terms first: two or three sentences a new team member understands. -->

### 1.1 Problem statement

<!-- What is wrong or missing today, who feels it, and how we know (PRD, customer, bug, data). -->

### 1.2 Business objective and value

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

## 2. Requirement mapping

<!-- Every PRD requirement, one row each, linked to where the TRD solves it. Nothing in the PRD may be missing; a requirement not delivered says so and why. -->

| ID | PRD requirement | Technical implementation | TRD section | Comments / assumptions |
| --- | --- | --- | --- | --- |
| R1 | <requirement as the PRD states it> | <how it is built> | Task <n> | <assumption, limit or "Not delivered – reason"> |

## 3. Assumptions, dependencies and constraints

| Type | Item | Status / Owner |
| --- | --- | --- |
| Assumption | <what we take as true; must be confirmed> | Confirmed by <name> / Open |
| Dependency | <other team, module, migration, PRD sign-off, external system> | <owner> |
| Constraint | <FedRAMP boundary, .NET version, platform page size, release window> | Fixed |

## 4. Existing system analysis

<!-- The current state, verified with file:line, before any solution. The closest existing feature this one follows, and what is reused unchanged. -->

**Current behaviour and components**

| Area | Current behaviour | Component | Reference |
| --- | --- | --- | --- |
| <area> | <behaviour> | <controller / service / table / screen> | `<path>:<line>` |

**Existing limitations**

- <what the current system cannot do or does badly, with evidence>

**Reason for change**

<why the limitations above must be fixed now, tied to the problem statement>

## 5. Proposed solution

### 5.1 Architecture overview

<!-- Two or three paragraphs: the shape of the solution end to end and how it fits the existing platform layers. -->

### 5.2 Component interaction

| Component | Responsibility | Talks to |
| --- | --- | --- |
| <component> | <single responsibility> | <other components> |

### 5.3 Request flow

<!-- A simple flow diagram drawn in text, then the steps. Keep it narrow (under 90 characters) so it fits the page. -->

```text
User ──> <Screen> ──> POST api/v1/<area> ──> <Controller> ──> <Service> ──> <schema>.<Table>
                                               │
                                               └──> Activity log
```

1. <step>

### 5.4 Data flow

<!-- How sample data looks in each table at each scenario (create, update, delete, edge case). Use realistic rows. If the developer wants it, the same tables are also exported to an Excel file. -->

**Scenario: <name>**

| Table | Column | Before | After |
| --- | --- | --- | --- |
| <schema>.<Table> | <column> | <value> | <value> |

### 5.5 Key decisions

<!-- One block per major design choice. -->

#### Decision: <title>

| Question | Answer |
| --- | --- |
| Why this approach | <reason, tied to this codebase> |
| Alternatives considered | <option – why not> |
| Risks and trade-offs | <what we give up, what could go wrong> |
| Components impacted | <modules, tables, endpoints, screens> |
| Testing and support | <how it is tested, how support diagnoses it> |
| Edge cases and failure behaviour | <what happens when it fails or input is odd> |

## 6. Tasks

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

<!-- Numbered steps of the real flow: happy path first, then validation, errors, edge cases and concurrency inline where they happen. Quote exact user-facing messages. -->

1. <step>
   - <rule / validation / message>

#### API changes

| Method | Endpoint | Authentication / privilege | Description |
| --- | --- | --- | --- |
| POST | `api/v1/<area>/list` | Signed-in user, <PRIVILEGE (M/V)> | <short description> |

##### POST `api/v1/<area>/list`

<one or two sentences: what it does and who calls it>

Authentication: <existing session / token; privilege and level; account and data scope>

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

Validation rules

| Field | Rule | Message |
| --- | --- | --- |
| <field> | <required, length, format, range, exists in account> | "<exact message>" |

Error handling

| Status | When | Message |
| --- | --- | --- |
| 401 | Missing privilege | — |
| 500 | <validation / not found / conflict> | "<exact message>" |

#### UI changes

<!-- Screens, new screens and fields are in the PRD and Figma: link them, do not copy them. Document only what they do not: validation rules, error messages, permissions, V2 components reused, and states (loading, empty, error, read-only, no permission). Grid: sort, search, filter, paging, display settings, column config. When there is a Figma design: one snapshot per screen, dialog or state this task builds or changes (nothing out of scope or unchanged), cropped to the part that matters (panel, dialog, form, grid, message), not the whole page, each followed by a one-line caption naming the Figma frame and what to notice (fields, order, messages). -->

Screens and fields: <PRD section / Figma link>

![<Screen / state> – Figma frame "<frame name>"](images/<task-n>-<screen>.png)

| Field / action | Validation rule | Error message |
| --- | --- | --- |
| <field> | <rule> | "<exact message>" |

| Role / privilege | Can see | Can do |
| --- | --- | --- |
| <privilege (V)> | <screens, fields> | <read only> |
| <privilege (M)> | <screens, fields> | <add, edit, delete> |

#### Acceptance criteria

<!-- Positive AND negative. Each one testable, observable and unambiguous. -->

- [ ] <positive: given / when / then>
- [ ] <negative: invalid input, missing privilege, other tenant's id, concurrent edit, dependency down>

## 7. API conventions

| Topic | Convention |
| --- | --- |
| Routes and verbs | <as the platform does it, verified> |
| Authentication | <existing mechanism; no new auth path> |
| Paging | <start, page size> |
| Search and sort | <request model> |
| Success | <response envelope> |
| Errors | <status codes and error body> |
| Concurrency | <rowVersion rule, or n/a> |
| Tenant and access | <account scoping and privilege filter> |
| Backward compatibility | <existing contracts unchanged; new fields additive> |

## 8. Impact analysis

| Area | Change | Affected consumers | Risk | Mitigation |
| --- | --- | --- | --- | --- |
| Modules | | | | |
| Integrations | | | | |
| APIs | | | | |
| Database | | | | |
| User workflows | | | | |

## 9. Security considerations and FedRAMP compliance

**Summary**

| Topic | This feature |
| --- | --- |
| Authentication | <existing auth only> |
| Authorization | <privileges, least privilege, data scope> |
| Sensitive data | <PII, financial, security data: what, where stored, classification> |
| Data exposure risks | <what could leak, to whom, through which endpoint, export or log> |
| Audit requirements | <what must be auditable> |
| Input validation | <server side, every input> |
| Data retention | <how long data is kept, deletion rules, or existing policy> |

**Abuse and exposure review**

<!-- Answer plainly: could this feature be abused or expose data unintentionally? Think of another tenant's ids, a lower-privilege user, mass export, enumeration, oversized input, injection, and data in logs or errors. -->

| Abuse / exposure case | Possible? | Prevention |
| --- | --- | --- |
| <case> | Yes / No | <control> |

**NIST 800-53 r5 / FedRAMP controls**

<!-- Every row must say how THIS feature meets the control, or "n/a – <reason>". -->

| Control | How this feature complies |
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
| SI-12 Information retention | <retention and disposal of new data> |
| CM-3 / CM-4 Change control | <migration review, security impact analysis, significant change?> |
| RA-5 / SA-11 Scanning and testing | <SAST/dependency scan, no new unapproved packages> |

## 10. Monitoring and logging

**Logs to be added**

| Event | Where logged | Fields | Purpose |
| --- | --- | --- | --- |
| <event> | <activity log / change history / app log> | <user, ids, old/new, traceId; no PII or secrets> | <audit / diagnosis> |

**Metrics to track**

| Metric | Source | Normal range |
| --- | --- | --- |
| <requests, failures, duration, rows processed> | <existing monitoring> | <value> |

**Alerts required**

| Alert | Condition | Who is notified |
| --- | --- | --- |
| <alert, or "None – reason"> | <threshold> | <team> |

**Support runbook**

| Symptom | Likely cause | How to check | Resolution |
| --- | --- | --- | --- |
| <symptom> | <cause> | <log query, table, endpoint> | <fix> |

Operational owner: <team that supports this in production>

## 11. Performance and scalability

| Topic | This feature |
| --- | --- |
| Expected volume | <rows per tenant, tenants, requests per day, peak> |
| Query impact | <queries per request, joins, worst query and its plan> |
| Indexing strategy | <summary; full list in section 13> |
| Bulk operations | <batch size, transaction size, limits, or n/a> |
| Pagination approach | <server side, page size, total count> |
| 10x growth | <will it still perform at 10x data, tenants and users? what breaks first?> |

**Caching**

<!-- One row per piece of data read often and changed rarely (lookups, settings, privileges, column definitions). "No cache" is a valid answer with its reason. Caches stay inside the authorized boundary (in-process memory or the platform's existing cache, never a new external service), keys always include AccountId, and PII or secrets are not cached unless the store is encrypted. -->

| Data | Cache? | Where | Key | Expiry / invalidation | Why |
| --- | --- | --- | --- | --- | --- |
| <data> | Yes / No | <in-memory / existing distributed cache / client state> | <AccountId + ...> | <TTL, cleared on save> | <read/write ratio, cost of a stale value> |

## 12. Edge cases and failure scenarios

| Scenario | Expected behaviour | Handling |
| --- | --- | --- |
| <scenario, including concurrent edits> | <behaviour the user sees> | <where in code, message, retry, rollback> |

## 13. Database changes

<!-- Explain why each change is required. -->

**Design**

<!-- Why the schema has this shape: normalisation, data types and lengths, nullability, defaults, delete behaviour (Restrict / No Action, never Cascade), soft delete, audit columns. Business rules the database itself must enforce go in Constraints, not only in code. -->

| Choice | Decision | Reason |
| --- | --- | --- |
| <normalisation / data type / nullability / delete behaviour> | <decision> | <reason> |

**Relationships**

| Parent | Child | Cardinality | On delete | Why |
| --- | --- | --- | --- | --- |
| <schema>.<Table> | <schema>.<Table> | 1 : many | Restrict | <rule> |

**Indexes**

<!-- Every index names the query it serves; no index without a query. Include INCLUDE columns and filtered indexes where they help. Check that an existing index does not already cover the query, and say what each index costs on writes. -->

| Index | Table | Key columns (INCLUDE) | Query it serves | Notes |
| --- | --- | --- | --- | --- |
| <IX_Table_Columns> | <schema>.<Table> | <col1, col2 (col3)> | <endpoint / grid search / delete check> | <unique, filtered, write cost> |

**Constraints**

| Constraint | Table | Type | Rule enforced |
| --- | --- | --- | --- |
| <name> | <schema>.<Table> | Primary key / Foreign key / Unique / Check / Default / Not null | <business rule> |

<!-- Inventory: every database object the feature touches, in one place, so nobody has to collect them from the tasks. Write "None" under a heading only when nothing applies. Full column lists stay in each task's Data model. -->

**New tables and objects**

| Object | Type | Module / Schema | Why required | Task |
| --- | --- | --- | --- | --- |
| <schema>.<Table> | Table / Index / View / Stored procedure / Seed data | <module> | <why it exists> | Task <n> |

**Modified tables and columns added**

| Object | Change | Why required | Existing data impact | Backward compatible | Task |
| --- | --- | --- | --- | --- | --- |
| <schema>.<Table> | <column added (type, null) / index / constraint / data fix> | <reason> | <rows affected, backfill> | Yes / No – <why> | Task <n> |

**Used without schema change**

| Object | Access | Columns used | Why | Task |
| --- | --- | --- | --- | --- |
| <schema>.<Table> | Read / Write / Read-Write | <columns> | <use> | Task <n> |

## 14. Migration strategy

<!-- Only when existing data is involved. If the Data team owns the data migration, say so in one line with the owner and skip the details. Schema migrations always list their name, module, order and rollback. -->

| Topic | Plan |
| --- | --- |
| Schema migration | <EF migration name, module, applied automatically or by hand, order> |
| Data migration steps | <steps, or "None – no existing data" / "Data team – owner"> |
| Validation approach | <row counts, sample checks, verification query> |
| Rollback strategy | <Down migration, restore script, what data is lost> |

## 15. Testing strategy

| Level | Scope | Cases (positive / negative) |
| --- | --- | --- |
| Unit | | |
| Integration / API | | |
| E2E automation (Playwright) | | |
| Regression | <modules that share changed code> | |
| Security | Cross-tenant ids, missing privilege, input tampering | |
| Performance | <volume and 10x targets> | |
| UAT | <who signs off, scenarios, test data, environment> | |

Edge cases to test: every row of section 12.

## 16. Deployment, cutover and rollback

| Topic | Plan |
| --- | --- |
| Deployment approach | <release order: database, backend, frontend; feature flag; configuration> |
| Cutover plan | <go-live playbook: steps in order, who does each, downtime, communication, point of no return> |
| Post-deployment validation | <smoke checks, queries, metrics to watch> |
| Rollback strategy | <trigger, steps in order, data impact> |

## 17. End-user impact

| Topic | This feature |
| --- | --- |
| Number of clicks | <before → after for the main journey> |
| Discoverability | <where users find it> |
| Error messaging | <clear, actionable, no internals> |
| Accessibility | <Section 508 / WCAG 2.1 AA: keyboard, screen reader, contrast> |
| Workflow efficiency | <what gets simpler, training or help text needed> |

## 18. Risks and mitigations

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| <risk, e.g. Large data volume> | <e.g. Slow page loads> · High / Medium / Low | High / Medium / Low | <e.g. Pagination and index optimisation> |

## 19. General design considerations

<!-- Answer each for THIS design, briefly and honestly. -->

| Area | Question | Answer |
| --- | --- | --- |
| Architecture alignment | Aligned with the current platform architecture? Existing capabilities reused? Unnecessary complexity? More technical debt? | |
| SOLID | Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion: where each applies, and are new components maintainable, testable and loosely coupled? | |
| Security and compliance | Least privilege, sensitive data exposure, auditability, data retention, NIST / FedRAMP and organisational standards | See section 9 |
| Scalability | Data growth, tenant growth, query performance, batch operations, concurrency. Will it still perform at 10x? | See section 11 |
| Supportability | Can a support engineer diagnose issues from the logs, metrics, alerts and runbook? Who owns it in production? | See section 10 |
| Testability | Unit, integration, regression and automation testing possible without special setup? | See section 15 |
| User experience | Clicks, discoverability, error messages, accessibility, workflow efficiency | See section 17 |
| Future extensibility | Configuration over customisation, backward compatibility, upgrade paths | See section 23 |

## 20. Decisions from review

<!-- Every decision agreed with the developer during review, newest last, one line each with who and when. -->

- <decision> – <name>, <YYYY-MM-DD>

## 21. Open questions

<!-- Anything not decided, with an owner. Empty only when nothing is open. -->

| Question | Owner | Needed by |
| --- | --- | --- |
| <question> | <owner> | <date / milestone> |

## 22. Implementation brief for developers and AI agents

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

- [ ] All acceptance criteria in section 6 pass, positive and negative
- [ ] Section 15 tests written and green; build and lint clean
- [ ] Logging in section 10 verified; section 9 controls met
- [ ] Migration applied and rolled back cleanly on a copy of production data

## 23. Future scaling and extensibility

<!-- How the design grows. Be specific to this feature and honest about limits. -->

| Topic | Today (this release) | Limit / trigger | Path forward |
| --- | --- | --- | --- |
| Data volume | <expected rows, tenants> | <where it slows down> | <partitioning, archiving, index, summary table> |
| Load | <requests per user action> | <concurrency limit> | <caching, async jobs, batching> |
| Extensibility | <entities / modules covered> | <what is not covered> | <how to add the next entity without schema change> |
| Integrations | <none / existing> | <future consumers: reports, mobile, API clients> | <contract or event to expose> |
| Configuration | <hard-coded rules> | <when customers need variation> | <setting, data field, feature flag: configuration over customisation> |
| Backward compatibility and upgrades | <contracts and data kept> | <what a later change could break> | <versioning, additive changes, upgrade path> |

## 24. Revision history

| Revision | Date | Author | Changes |
| --- | --- | --- | --- |
| r1 | <YYYY-MM-DD> | <name> | First draft |

## Appendix A – TRD design checklist

<!-- Tick each item only when the TRD really covers it. An unticked item says why in one line after it. -->

**Business and functional**

- [ ] Problem statement clearly defined
- [ ] Business objective understood
- [ ] Requirements mapped to solution
- [ ] Scope and out of scope documented
- [ ] Assumptions identified
- [ ] Open questions captured

**Architecture and design**

- [ ] Solution aligns with existing architecture
- [ ] Reuse of existing components evaluated
- [ ] SOLID principles considered
- [ ] Design minimises technical debt
- [ ] Alternative approaches considered and documented

**Functional flow**

- [ ] Happy path covered
- [ ] Error scenarios covered
- [ ] Edge cases identified
- [ ] Concurrency scenarios evaluated
- [ ] Validation rules documented

**Data and database**

- [ ] Data model changes documented
- [ ] Indexing requirements reviewed
- [ ] Data retention requirements evaluated
- [ ] Data migration considerations documented
- [ ] Rollback approach identified

**API and integration**

- [ ] API contract documented
- [ ] Error handling defined
- [ ] Backward compatibility considered
- [ ] External dependencies identified

**Security and compliance**

- [ ] Authentication requirements reviewed
- [ ] Authorization requirements reviewed
- [ ] Sensitive data handling reviewed
- [ ] Audit requirements documented
- [ ] NIST / FedRAMP implications considered
- [ ] Regulatory or organisational compliance requirements reviewed

**Performance and scalability**

- [ ] Expected data volumes evaluated
- [ ] Query performance reviewed
- [ ] Pagination strategy defined
- [ ] Scalability considerations documented
- [ ] 10x growth scenario considered

**Supportability and operations**

- [ ] Logging requirements defined
- [ ] Monitoring requirements identified
- [ ] Alerting requirements identified
- [ ] Troubleshooting approach documented
- [ ] Production support impact evaluated

**Testing**

- [ ] Unit test scenarios identified
- [ ] Integration test scenarios identified
- [ ] Regression impact identified
- [ ] Negative test cases considered

**Deployment**

- [ ] Deployment approach documented
- [ ] Cutover plan documented
- [ ] Rollback strategy documented
- [ ] Post-deployment validation defined

**User experience**

- [ ] User workflow reviewed
- [ ] Discoverability considered
- [ ] Error messages reviewed
- [ ] Accessibility considerations reviewed
- [ ] Click reduction / workflow simplification considered
