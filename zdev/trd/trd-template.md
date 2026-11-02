# <Feature Name> – Technical Requirement Document

<!-- Template for /zdev:new-trd. Two readers: a reviewer (technical or not) who reads only the summary and the main body, and a developer or AI agent who also uses the appendices. The main body (summary + sections 1–10) is 10 to 15 pages, plain language, and holds the decisions, scope and acceptance criteria. It contains NO SQL, JSON, code, `path:line` references or long validation tables: those go to the appendices, and the main body points to them. Explain each term once, in section 2. State each rule once and point to it elsewhere. Keep the section order; section numbers are a guide. Delete a section only when it truly does not apply, and say so in one line ("No database change"). Remove every guidance comment before the draft is shared. No Mermaid or raw HTML: the DOCX converter renders Markdown headings, paragraphs, lists, task lists, tables, code blocks, block quotes and local PNG/JPG images (Figma snapshots, `![caption](images/<file>.png)` relative to this file) only. Diagrams are plain-text drawings inside a code block. -->

## Summary

<!-- One page. A reader who stops here knows what is being built, what is not, and every decision taken. -->

<One paragraph in plain words: what the feature does, for whom, and why.>

**Scope**

- <in scope, one line>
- <in scope, one line>
- <out of scope, the main item a reader may expect>

**Key decisions**

| # | Decision (one line) | Explained in |
| --- | --- | --- |
| D1 | <e.g. Tags are stored in their own table, not in the building's JSON column> | Section 4.1 |
| D2 | <decision> | Section 4.2 |

## Status, owners and open decisions

| Item | Value |
| --- | --- |
| Feature | <one line: what the feature is> |
| Parent PRD / Work item | <link or id, or TBD> |
| Location in the app | <e.g. Portfolio > Settings > Data Fields> |
| Type | <New Development / Enhancement / Fix> |
| Author | <name> |
| Reviewers / sign-off | <names and roles> |
| Status | Draft r1 |
| Date | <YYYY-MM-DD> |

**Open decisions** (awaiting sign-off; nothing here is a settled requirement)

| # | Decision needed | Options | Owner | Needed by |
| --- | --- | --- | --- | --- |
| O1 | <question> | <option A / option B, recommendation> | <owner> | <date / milestone> |

## 1. Problem and goals

<!-- Two or three short paragraphs a non-technical reader understands: what is wrong or missing today, who feels it, how we know (PRD, customer, bug, data), and what this implementation sets out to achieve. End with the measurable goals. -->

**Goals**

- <outcome, measurable where possible>

## 2. Concepts

<!-- The few ideas a reader must hold to follow the rest, each explained once here and nowhere else. Use one running example (a real-looking record the reader can picture) and walk it through the concepts. Then a short table of names. This replaces scattered definitions; the full glossary and identifier rules are in Appendix H. -->

<Explain the core concepts in plain words, with one example that carries through the document.>

| Name | What it is | Example |
| --- | --- | --- |
| <term> | <one line> | <example value> |

## 3. Scope

**In scope**

- <item>

**Out of scope**

- <item, and why or where it goes instead>

**Approved deviations from the PRD**

<!-- Only deviations someone has signed off, with who and when. A deviation not yet approved goes to Open decisions, not here. "None" if the TRD follows the PRD. -->

| PRD says | This TRD does | Why | Approved by |
| --- | --- | --- | --- |
| <requirement> | <what is built instead> | <reason> | <name, date> |

The full mapping of every PRD requirement to this TRD is in Appendix I.

## 4. Key design decisions

<!-- One short subsection per decision in the Summary table, same numbers. Plain language: a reviewer should follow the reasoning without reading code. Cover at least, where they apply: where the data is stored, how access is decided, how the feature's data is mapped or linked to existing data, how concurrent changes / versions are checked, how the feature is kept separate from screens it must not affect, how reports or exports are built, and how the feature is rolled back. Technical detail goes to the appendix named in "Detail". -->

### 4.1 <Decision title>

| | |
| --- | --- |
| Options considered | <A – one line; B – one line> |
| Choice | <the option chosen> |
| Why | <reason, tied to this platform> |
| Trade-off | <what we give up, what could go wrong> |
| Detail | Appendix <letter> |

## 5. User flow

<!-- The journey from setup to everyday use, in numbered plain-language steps (usually three to six), with ONE diagram. Say who does each step. Show the journey overview snapshot here when there is a Figma design. Screen-level detail and the other snapshots are in Appendix K. -->

```text
<Role> ──> <Step 1> ──> <Step 2> ──> <Step 3> ──> <Result>
```

1. <who does what, and what they see>

![Journey overview – Figma frame "<frame name>"](images/overview-<name>.png)

## 6. Access and visibility rules

<!-- The single source for who can see and change what. Other sections and appendices refer to this table and never restate the rules. Add a Stage column when access changes with the record's state or workflow stage. -->

| Role / privilege | Stage | Can see | Can change |
| --- | --- | --- | --- |
| <privilege (V)> | <stage, or "Any"> | <screens, data> | Nothing |
| <privilege (M)> | <stage> | <screens, data> | <add, edit, delete> |

All data is limited to the user's own account. The server enforces every rule above; the screen only hides what the user cannot use.

## 7. Non-functional requirements

<!-- Short lists, each item with a target. Detail is in the appendix named. -->

**Security and compliance** (full control mapping: Appendix J)

- <e.g. No new external service or data flow; stays inside the FedRAMP boundary>
- <e.g. Every input validated on the server>
- <answer in one line: could this feature be abused or expose data unintentionally?>

**Audit**

- <what is recorded: who, what, when, old and new values>

**Performance and volume**

- <expected volume, e.g. up to 500 tags per building, 20,000 buildings per account>
- <target, e.g. grid loads in under 2 seconds at 10x today's volume>
- <caching: what is cached, where, and how it is cleared, or "No cache – reason">
- <what breaks first as data grows, and the path forward>

**Supportability** (logs, alerts and runbook: Appendix G)

- <how support diagnoses a problem; operational owner>

**Accessibility**

- <Section 508 / WCAG 2.1 AA: keyboard, screen reader, contrast>

## 8. Risks and dependencies

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| <risk> | High / Medium / Low | High / Medium / Low | <mitigation> |

**Dependencies** (named here, specified by their owners)

| Dependency | Owner | Needed for |
| --- | --- | --- |
| <data migration, other team, design file, configuration> | <owner> | <what it blocks> |

**Assumptions**

- <what we take as true; confirmed by whom, or open (then also in Open decisions)>

## 9. Acceptance criteria

<!-- Grouped by feature area. Each one short, testable and observable, positive and negative (invalid input, missing privilege, another account's data, concurrent edit, dependency failure, empty and large data). Each links to its tests in the Appendix F test matrix. -->

**<Feature area>**

| # | Criterion | Tests |
| --- | --- | --- |
| AC1 | <given / when / then, in plain words> | F-1, F-2 |
| AC2 | <negative case> | F-3 |

## 10. Rollout and rollback

| Topic | Plan |
| --- | --- |
| Feature flag | <name, default, who turns it on, or "None – reason"> |
| Deployment order | <database, backend, frontend, configuration> |
| Go / no-go checkpoint | <what must be true before turning it on; who decides> |
| Post-deployment checks | <smoke checks, what to watch> |
| Rollback | <trigger, then steps in order; how data entered so far is kept> |

---

<!-- The rule above starts a new page in the DOCX. Appendices: the technical detail, for developers, testers, support and AI agents. Self-contained: a developer or agent given only this file must be able to build, test and support the feature. Write "None" under an appendix that does not apply. -->

## Appendix A – Database schema and migration

**Why each change is required**

| Object | Change | Why required | Existing data impact | Backward compatible |
| --- | --- | --- | --- | --- |
| <schema>.<Table> | New table / column added (type, null) / index / constraint | <reason> | <rows affected, backfill> | Yes / No – <why> |

**New table `<schema>.<Table>`**

| Column | Type | Notes |
| --- | --- | --- |
| <Id> | int, identity | Primary key |
| UniqueId | uniqueidentifier | Public identifier used by the API |
| AccountId | uniqueidentifier | Owning account (tenant scope) |
| AddedBy / AddedOn | uniqueidentifier / datetime2 | Audit columns |
| UpdatedBy / UpdatedOn | uniqueidentifier, null / datetime2, null | Audit columns |

**Design choices**

<!-- Normalisation, types and lengths, nullability, defaults, delete behaviour (Restrict / No Action, never Cascade), soft delete. Rules the database can enforce go in Constraints. -->

| Choice | Decision | Reason |
| --- | --- | --- |
| <topic> | <decision> | <reason> |

**Relationships**

| Parent | Child | Cardinality | On delete | Why |
| --- | --- | --- | --- | --- |
| <schema>.<Table> | <schema>.<Table> | 1 : many | Restrict | <rule> |

**Indexes**

<!-- Every index names the query it serves; none duplicates an existing index; note the write cost. -->

| Index | Table | Key columns (INCLUDE) | Query it serves | Notes |
| --- | --- | --- | --- | --- |
| <IX_Table_Columns> | <schema>.<Table> | <col1, col2 (col3)> | <endpoint / grid search / delete check> | <unique, filtered, write cost> |

**Constraints**

| Constraint | Table | Type | Rule enforced |
| --- | --- | --- | --- |
| <name> | <schema>.<Table> | Primary key / Foreign key / Unique / Check / Default | <business rule> |

**Used without schema change**

| Object | Access | Columns used | Why |
| --- | --- | --- | --- |
| <schema>.<Table> | Read / Write | <columns> | <use> |

**Data flow samples**

<!-- Before/after rows per scenario (create, update, delete, edge case). If the developer wants it, the same tables are also exported to Excel. -->

| Scenario | Table | Column | Before | After |
| --- | --- | --- | --- | --- |
| <scenario> | <schema>.<Table> | <column> | <value> | <value> |

**Migration**

| Topic | Plan |
| --- | --- |
| Schema migration | <EF migration name, module, order> |
| Data migration | <steps, or "None – no existing data" / "Data team – owner"> |
| Validation | <row counts, verification query> |
| Rollback | <Down migration or restore script; what data is kept> |

<SQL or migration script where it helps, in a `sql` code block.>

## Appendix B – API contracts and payload examples

**Conventions**

| Topic | Convention |
| --- | --- |
| Routes and verbs | <as the platform does it, verified> |
| Authentication | <existing mechanism; no new auth path> |
| Paging, search and sort | <request model> |
| Success / errors | <response envelope, status codes, error body> |
| Concurrency | <rowVersion rule, or n/a> |
| Tenant and access | <account scoping; privileges per section 6> |
| Backward compatibility | <existing contracts unchanged; new fields additive> |

**Endpoints**

| Method | Endpoint | Privilege | Description |
| --- | --- | --- | --- |
| POST | `api/v1/<area>/list` | <PRIVILEGE (V)> | <short description> |

### POST `api/v1/<area>/list`

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

Validation, in order

| Step | Field | Rule | Message |
| --- | --- | --- | --- |
| 1 | <field> | <required, length, format, exists in account> | "<exact message>" |

Errors

| Status | When | Message |
| --- | --- | --- |
| 401 | Missing privilege | — |
| 500 | <validation / not found / conflict> | "<exact message>" |

## Appendix C – Configuration and stored data formats

<!-- JSON or other structured formats the feature stores or reads (settings, field access, mappings), feature flags and configuration keys, each with a sample and the rule for every property. "None" if the feature stores no structured format. -->

## Appendix D – Reports, procedures and calculations

<!-- Stored procedures, report or export logic, column rules and calculations, with the procedure signature and a sample of the output. "None" if not applicable. -->

## Appendix E – Code map

<!-- For the developer or agent starting from this file alone. `path:line` belongs here. -->

**Existing system**

| Area | Current behaviour | Component | Reference |
| --- | --- | --- | --- |
| <area> | <behaviour> | <controller / service / table / screen> | `<path>:<line>` |

**What changes**

| Layer | Path | Existing pattern to copy | What to add or change |
| --- | --- | --- | --- |
| Database | `<path>` | `<similar migration / entity>` | <change> |
| Backend API | `<path>` | `<similar controller / service>` | <change> |
| Frontend | `<path>` | `<similar page / V2 component>` | <change> |
| Tests | `<path>` | `<similar test>` | <change> |

**Impact on existing code**

| Area | Change | Affected consumers | Mitigation |
| --- | --- | --- | --- |
| <module / API / table / workflow> | <change> | <callers found> | <mitigation> |

**Build order**

1. <step, and how to know it is done>

**Rules that must not be broken**

- <account scoping, privilege checks, FedRAMP rules, no Cascade deletes, existing contracts kept, house conventions>

**Definition of done**

- [ ] Every acceptance criterion in section 9 passes, with its Appendix F tests green
- [ ] Build and lint clean; Appendix G logging verified; Appendix J controls met
- [ ] Migration applied and rolled back cleanly on a copy of production data

## Appendix F – Test matrix

| Test | Level | Scenario | Expected result | Covers |
| --- | --- | --- | --- | --- |
| F-1 | Unit / API / E2E / Regression / Performance / UAT | <scenario> | <result> | AC1 |

**Edge cases and failures** (every one has a test above)

| Scenario | Expected behaviour | Test |
| --- | --- | --- |
| <scenario, including concurrent edits> | <what the user sees> | F-<n> |

**Security tests**

| Case | Expected result | Test |
| --- | --- | --- |
| <another account's id, missing privilege, tampered input, oversized input, mass export> | <rejected, message> | F-<n> |

## Appendix G – Monitoring and runbook

**Logs**

| Event | Where logged | Fields (no PII or secrets) | Purpose |
| --- | --- | --- | --- |
| <event> | <activity log / change history / app log> | <user, ids, old/new, traceId> | <audit / diagnosis> |

**Metrics and alerts**

| Metric or alert | Source | Normal range / condition | Who is notified |
| --- | --- | --- | --- |
| <metric, or "No alert – reason"> | <existing monitoring> | <value> | <team> |

**Runbook**

| Symptom | Likely cause | How to check | Resolution |
| --- | --- | --- | --- |
| <symptom> | <cause> | <log query, table, endpoint> | <fix> |

Operational owner: <team>

## Appendix H – Glossary and identifier rules

| Term | Meaning |
| --- | --- |
| <term> | <meaning> |

| Identifier | Format | Where it is used | Example |
| --- | --- | --- | --- |
| <e.g. UniqueId> | <guid / code pattern> | <API, URL, report> | <value> |

## Appendix I – Requirement mapping

<!-- Every PRD requirement, one row each. Nothing in the PRD left unmapped; a requirement not delivered says so and why. -->

| ID | PRD requirement | How it is delivered | Section | Comments |
| --- | --- | --- | --- | --- |
| R1 | <requirement> | <short> | 4.1, AC1 | <assumption, limit or "Not delivered – reason"> |

## Appendix J – Security and FedRAMP control mapping

**Abuse and exposure review**

| Case | Possible? | Prevention |
| --- | --- | --- |
| <another account's ids, lower privilege, enumeration, mass export, injection, data in logs> | Yes / No | <control> |

**NIST 800-53 r5 / FedRAMP controls** (each row says how THIS feature complies, or "n/a – reason")

| Control | How this feature complies |
| --- | --- |
| AC-3 / AC-6 Access enforcement, least privilege | <per section 6> |
| AC-4 Tenant isolation | <AccountId scoping on every query, including raw SQL> |
| AU-2 / AU-3 / AU-12 Audit events | <who, what, when, old/new values> |
| AU-9 Audit protection | <audit records not editable by the feature> |
| IA-2 Identification and authentication | <existing auth only> |
| SC-7 Boundary protection | <no new third-party service or data flow> |
| SC-8 / SC-13 Transmission, cryptography | <TLS 1.2+, FIPS 140 validated modules, or n/a> |
| SC-28 Protection at rest | <encryption, PII classification> |
| SI-10 / SI-11 Input validation, error handling | <server-side validation; no internals in responses> |
| SI-12 Information retention | <retention and disposal> |
| CM-3 / CM-4 Change control | <security impact; significant change request needed?> |
| RA-5 / SA-11 Scanning and testing | <no new unapproved packages> |

## Appendix K – Screens and field rules

<!-- Screens and fields are in the PRD and Figma: link them, do not copy them. Here: per screen, the Figma snapshots of what a task builds or changes (cropped to the part that matters, each with a caption naming its frame), field validation, exact messages and states (loading, empty, error, read-only, no permission). Who sees what is in section 6, not here. -->

Screens and fields: <PRD section / Figma link>

### <Screen>

![<Screen / state> – Figma frame "<frame name>"](images/<task-n>-<screen>.png)

<one line: what to notice>

| Field / action | Validation rule | Error message |
| --- | --- | --- |
| <field> | <rule> | "<exact message>" |

## Appendix L – TRD design checklist

<!-- Tick an item only when the TRD really covers it. An unticked item says why in one line. -->

- [ ] Problem, goals, scope and out of scope clear to a non-technical reader
- [ ] Every PRD requirement mapped (Appendix I); deviations approved or listed as open decisions
- [ ] Every key decision has options, choice and trade-off, and appears in the Summary table
- [ ] Reuse of existing components evaluated; no needless complexity or new debt
- [ ] Access rules stated once (section 6) and enforced on the server
- [ ] Happy path, errors, edge cases and concurrency covered and tested (Appendix F)
- [ ] Data model, indexes, constraints, retention and migration documented (Appendix A)
- [ ] API contracts, validation, errors and backward compatibility documented (Appendix B)
- [ ] Authentication, authorization, sensitive data, audit and FedRAMP reviewed (Appendix J)
- [ ] Volume, query performance, pagination and 10x growth considered
- [ ] Logging, alerts, runbook and owner defined (Appendix G)
- [ ] Rollout, go / no-go, post-deployment checks and data-keeping rollback defined
- [ ] Discoverability, error messages, accessibility and click count reviewed

## Revision history

| Revision | Date | Author | Changes |
| --- | --- | --- | --- |
| r1 | <YYYY-MM-DD> | <name> | First draft |
