---
description: "zDev - add a new Custom Report data source to zOne: collect the spec, study the closest existing report, write the three SQL migrations (data set and columns, report procedure, dispatcher branch) with their EF wrappers, and verify consistency. Never runs migrations or touches the database"
argument-hint: "<report name> [module, columns, source tables, spec docs or screenshots]"
model: opus
disable-model-invocation: true
---

# New Custom Report

Request: `$ARGUMENTS`

You add one new data source to the zOne Custom Report builder, as SQL scripts wrapped by EF migrations. Follow the project's `CLAUDE.md` over anything here. Never fabricate a name, column or table: mark every statement **verified** (with `path:line`) or **assumed**. Never run a migration, never write to a shared database, never ask for or type a password.

Read `${CLAUDE_PLUGIN_ROOT}/reference/custom-report-guide.md` first (if the path isn't expanded, Glob `**/zdev/**/reference/custom-report-guide.md` under `~/.claude/plugins/`). It holds the table model, the run-time flow, the migration shapes and the pitfalls. This command is the procedure; the guide is the reference.

## 1. Locate the checkout

The workspace root is the folder that holds `backend\` (for example `D:\zOne`). Read its `CLAUDE.md` files. If graphify output exists, use it to find the closest report. Set the task list (`update_plan`): `Collect the spec`, `Investigate`, `Confirm the spec`, `Write migrations`, `Verify`, `Hand off`.

## 2. Collect the spec

Read everything supplied (docs, Excel, screenshots, a similar report). Then ask, with `AskUserQuestion`, only what is still missing, grouped, with a recommendation where there is one:

- Report name, **DataSourceName** (shown to users), **DataSetName** (default `Custom <Name> Report`).
- Owning **module and schema** (decides where the procedure lives).
- **CloudCode** (the module code; default: the neighbouring data source of the same module).
- **Columns**: code, label, type (`text`, `decimal` and the other `base.DataFieldTypes` names), length, position.
- **Source tables and joins**, and the column that scopes by account.
- Time-zone parameters needed? Chart widgets supported? Site or Building custom fields? Criteria (filters)?

Do not ask what the references or the code already answer.

## 3. Investigate (read-only)

1. Confirm the DataSetName and DataSourceName are unused: `grep -rn "<DataSetName>" backend --include=*.sql`, excluding `bin` and `obj`.
2. Find the **closest existing report** in the same module and copy its procedure instead of starting blank. Look in both `<Module>\Scripts` and `<Module>\ScriptObjects`, because some report procedures live as ScriptObjects files.
3. Read the data-source migration, the procedure migration and the dispatcher migration of that closest report, and the migration wrapper pair to copy.
4. List the valid `DataFieldTypeName` values from the repo's scripts (not by guessing) and the CloudCodes in use.
5. **Dispatcher, the highest-risk step.** Find the newest script anywhere in `backend` (all modules, not only Base) that creates or alters `spBASE_GetCustomReportData`, with `grep -rliE "(CREATE|ALTER)\s+PROC.*spBASE_GetCustomReportData" backend --include=*.sql`, excluding `bin` and `obj`, and sort by timestamp. Its full `CASE` is the base for the change. If the user can paste the live definition (`SELECT OBJECT_DEFINITION(OBJECT_ID('base.spBASE_GetCustomReportData'))`), diff it against that script and use the live one when they differ. Never ask the user for a password or a connection.
6. Check whether the module has a `ScriptObjects` file for the procedure family and whether it overrides migrations at startup; say what you found.

Report the findings in chat: the closest report, the dispatcher base script (path and its latest timestamp), and anything that differs from the guide.

## 4. Confirm the spec (mandatory before any file is written)

Post one summary in chat: names (DataSourceName, DataSetName, procedure name, DataField prefix `CR_<REPORT>_`), CloudCode, the column table (code, label, type, length, position), source tables and joins, parameters, the three scripts with their file names and timestamps (strictly increasing and later than the dispatcher base script), the files that will be added, and every assumption. End your turn with: *"Reply **go** to write these, or tell me what to change."* Only an explicit confirmation counts.

## 5. Write the migrations

Add files only; change no existing file except as stated. Match CRLF line endings. Create every `.cs` and `.Designer.cs` wrapper by copying a recent pair of that module and changing only the timestamp, class name and `[Migration("...")]` id.

1. **Data set, columns and data source** (Base): `Base\Scripts\<ts>_Add_<Name>_CustomDataSource.sql`, idempotent, in one `TRY/TRANSACTION`, shaped like the reference. Also `CustomDataSets` rows if the report borrows another data set's columns.
2. **Report procedure** (owning module): `sp<Module>_Get<Name>CustomReport` with the mandatory signature, the standard steps copied from the closest report, every query scoped by `@AccountId`, time-zone parameters only if needed. Where the closest report keeps its procedure in `ScriptObjects`, follow that layout.
3. **Dispatcher** (Base): a new script that is the full current dispatcher with **one added `WHEN '<DataSetName>' THEN '<schema>.<proc>'` line** and nothing else changed.

## 6. Verify

- The DataSetName string is identical in the four places: `base.DataSet`, `base.CustomDataSources`, the dispatcher `CASE`, and the procedure's logic. Grep and show it.
- The dispatcher script differs from its base script by exactly the one added line: show the diff.
- Timestamps are unique and increasing; each SQL file has its wrapper; no existing file changed.
- Build the touched projects with `dotnet build` and report the real result. Do not run `dotnet ef database update`.
- Give the user the read-only verification queries from the guide, with the names filled in, to run after they apply the migrations.

## 7. Hand off

Short summary: purpose, files added (links), the dispatcher base script used, the four-place name check, what was verified and what was not (nothing was run against a database), and the steps for the user: apply migrations, create a report from the new data source in the Reports page, then add criteria if needed.
