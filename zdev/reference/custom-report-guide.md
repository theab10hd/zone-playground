# Implementing a new Custom Report (zOne)

Reference for `/zdev:new-report`. Checked against `dev_odot_zone` (read-only) and the repo in November 2026. Items marked **(unverified)** were not confirmed. Re-check names and the newest dispatcher script in the repo each time; do not trust the examples below to be current.

## 1. Mental model

The Custom Report builder has a **catalog** side and a **saved-report** side. Do not mix them up.

| Side | Table | One row is… |
|---|---|---|
| Catalog | `base.CustomDataSources` | a data source the user can pick (`DataSourceName`, **`DataSetName`**, `CloudCode`, `OrderNumber`) |
| Catalog | `base.DataSet` | a named data set (`DataSetName` → `DataSetId`) |
| Catalog | `base.DataFields` | a column the user can pick. `DataSetId` points at `base.DataSet` |
| Catalog | `base.CustomDataSets` | *extra* data sets a data source borrows columns from (`DataSourceId`, `DataSetId`), for example Location and Building custom fields |
| Saved | `base.CustomReports` | report header (name, `ReportGroupId`, `AccountId`, `IsShared`, `CanEdit`) |
| Saved | `base.CustomReportDataSources` | a data source or widget **inside one saved report**. Its `ReportDatasourceId` is what the UI passes to the procedure |
| Saved | `base.CustomReportColumns` | the columns the user picked (`DataFieldId`, `Label`, `Position`, `GroupIndex`, totals) |
| Saved | `base.CustomReportCriteria` | filter on a saved report (`CustomReportId`, `ReportDatasourceId`, `DataFieldId`, `Query`) |
| Unused | `base.CustomDataSourceColumns` | 0 rows, ignore |

Run-time flow:

```
UI -> CustomReportService -> base.spBASE_GetCustomReportData(@AccountId,@UserId,@Filter,@ReportDataSourceId,@CriteriaFilter,@TimeZoneId,@TimeOffset)
   -> CustomReportDataSources.DatasourceId -> CustomDataSources.DataSetName
   -> CASE @DataSetName WHEN '<DataSetName>' THEN '<schema>.<report proc>'   (hardcoded in the dispatcher)
   -> EXEC <report proc> @AccountId,@UserId,@Filter,@ReportDataSourceId,@CriteriaFilter[,@TimeZoneId,@TimeOffset]
```

- A `DataSetName` missing from the `CASE` returns `SELECT 999` (the report silently returns nothing useful).
- `@TimeZoneId, @TimeOffset` are passed only if the report procedure declares `@TimeZoneId`.
- The `DataSetName` string must be identical in **four** places: `base.DataSet`, `base.CustomDataSources`, the dispatcher `CASE`, and the report procedure's logic.

## 2. What the developer builds (migrations)

All DB changes are SQL scripts wrapped by an EF migration. Pattern (copy exactly):

- SQL file: `<Module>/Scripts/<yyyyMMddHHmmss>_<Name>.sql`
- C# wrapper: `<Module>/DataContext/Migrations/<yyyyMMddHHmmss>_<Name>.cs` (+ `.Designer.cs`)
- `Scripts\*.*` is a `<Content>` item in the csproj, so no csproj edit is needed for new scripts.

```csharp
// Migration wrapper: Up reads the script, Down is empty
protected override void Up(MigrationBuilder migrationBuilder)
{
    var path = Environment.CurrentDirectory;
    string sql = File.ReadAllText(Path.Combine(path, "Scripts\\<timestamp>_<Name>.sql"));
    migrationBuilder.Sql(sql);
}
protected override void Down(MigrationBuilder migrationBuilder) { }
```

Make the `.cs` and `.Designer.cs` by copying a recent pair for that module and changing only the timestamp, class name and `[Migration("...")]` id **(unverified: whether `dotnet ef migrations add` is the team's route)**.

### Migration 1: data set, columns and data source (Base module)

Reference: `zLink.Business.zOne.Base/Scripts/20261008075028_Add_BuildingOpEx_Vs_LeaseExpense_CustomDataSource.sql`

Key shape (idempotent, in one transaction):

```sql
DECLARE @DataSetName nvarchar(200) = 'Custom <X> Report';   -- the key used everywhere
DECLARE @DataSourceName nvarchar(200) = '<X>';              -- shown to the user

IF NOT EXISTS (SELECT 1 FROM [base].[DataSet] WHERE [DataSetName] = @DataSetName)
    INSERT INTO [base].[DataSet] ([DataSetName],[UniqueId]) VALUES (@DataSetName, NEWID());

-- columns: one row per pickable column, DataFieldName is the stable code
INSERT INTO [base].[DataFields] ([UniqueId],[DataSetId],[DataFieldName],[Label],[DataFieldTypeId],[DataFieldLength],
        [UIControl],[UIProperties],[DataFieldPosition],[AccountId],[IsRequiredField],[IsMultiValued],
        [AllowCustomListValue],[HasListValues],[StatusId],[HasRelationship],[ParentDataFieldId])
SELECT NEWID(), @DataSetId, f.DataFieldName, f.Label, t.DataFieldTypeId, f.DataFieldLength, t.DefaultUIControl, NULL,
       f.DataFieldPosition, NULL, 0,0,0,0, 1, 0, NULL
FROM @Fields f JOIN [base].[DataFieldTypes] t ON t.DataFieldTypeName = f.DataFieldTypeName
WHERE NOT EXISTS (SELECT 1 FROM [base].[DataFields] d WHERE d.DataFieldName = f.DataFieldName AND d.DataSetId = @DataSetId);

IF NOT EXISTS (SELECT 1 FROM [base].[CustomDataSources] WHERE [DataSourceName]=@DataSourceName AND [DataSetName]=@DataSetName)
    INSERT INTO [base].[CustomDataSources] ([DataSourceName],[UniqueId],[CloudCode],[DataSetName],[OrderNumber])
    SELECT @DataSourceName, NEWID(), '<CloudCode>', @DataSetName, ISNULL(MAX([OrderNumber]),0)+1 FROM [base].[CustomDataSources];
```

Rules:
- Field type names come from `base.DataFieldTypes.DataFieldTypeName` (seen: `text`, `decimal`). Look up the list before using others.
- `DataFieldName` convention: `CR_<REPORT>_<FIELD>` in upper case, for example `CR_BUILDING_OPEX_VS_LEASE_SITE`.
- `CloudCode` is the module code (seen: `CND`, `RPM`, `EQU`, `STR`, `SCH`, `WOHUB`). Copy from the neighbouring data source of the same module.
- Wrap in `BEGIN TRY / BEGIN TRANSACTION / CATCH ... RAISERROR` like the reference.
- **Adding columns later**: new script, `IF NOT EXISTS` per field, position `MAX(DataFieldPosition)+1`. Reference: `20260926150100_Add_BuildingOpEx_Region_District_Datafields.sql`.
- **Reusing another data set's columns** (for example Location or Building custom fields): second script inserting into `base.CustomDataSets (DataSourceId, DataSetId)`. Reference: `20261008090215_Add_BuildingOpEx_Vs_LeaseExpense_CustomDataSets.sql`. If you do, the report procedure must pivot those fields itself (see Migration 2).

### Migration 2: the report procedure (the module that owns the data)

Reference: `zLink.Business.zOne.Lease/Scripts/20261008085655_Add_spLease_GetBuildingOpExVsLeaseExpenseCustomReport.sql` (and the matching migration in `Lease/DataContext/Migrations`).

- Put it in the module whose tables it reads (Lease for lease data, Maintenance for `amm.*`, Projects for `prj.*`, Store for `str.*`, Portfolio.Assessments for `cnd.*`). Schema prefix follows the module, name `sp<Module>_Get<X>CustomReport`.
- **Scripts or ScriptObjects.** Some report procedures live in the module's `ScriptObjects` folder instead of `Scripts` (for example `Lease/ScriptObjects/lease.spLease_GetRealPropertyCustomReport.sql`, and several under `Maintenance/ScriptObjects`). Follow the layout of the closest existing report in the same module. Whether `ScriptObjects` files override migrations at startup is **(unverified)**; check the module's initializer before assuming a migration alone changes such a procedure.
- Script starts with the drop-if-exists + `GO` + `CREATE PROCEDURE` form used by the neighbours.
- Signature (mandatory, same order as the dispatcher call):

```sql
CREATE PROCEDURE [<schema>].[sp<Module>_Get<X>CustomReport]
(
    @AccountId uniqueidentifier, @UserId uniqueidentifier, @Filter varchar(max),
    @ReportDataSourceId int, @CriteriaFilter varchar(max) = '',
    -- add only if the report shows dates/times; the dispatcher passes them only when declared
    @TimeZoneId int = NULL, @TimeOffset int = 0
)
```

Standard steps inside (copy from the reference, do not reinvent):
1. Resolve `DataSetName` and widget code from `CustomReportDataSources` joined to `CustomDataSources` and `base.Widgets`. `@IsChart` is true for `PIE_CHART`, `BAR_CHART`, `AREA_CHART`.
2. Load the picked columns from `base.CustomReportColumns` joined to `base.DataFields`; build `@StrColumns` and `@GroupByColumns` (charts: measures `GroupIndex = 0` are `SUM`/`COUNT`, dimensions `GroupIndex > 0` are grouped).
3. Clean `@Filter` (the `REPLACE` block), then merge `@CriteriaFilter` (JSON of `{DataFieldName: value}`) into `@Filter` using `CustomReportCriteria.Query` templates.
4. Build the base query into a temp table (`#Temp2` in the reference), apply `@Filter` as the WHERE, return the result with the user's labels as aliases.
5. Scope every query by `@AccountId`. Never skip this (multi-tenant).

If the report exposes Site or Building **custom fields**, copy the `AssetMetadata` pivot blocks from the reference (prefix `Building.` and `Site.`).

### Migration 3: register in the dispatcher (Base module)

**Highest-risk step.** Every dispatcher migration rewrites the *whole* procedure, so a copy of an old version silently drops other data sets.

1. Take the **newest** definition, not an old migration file. Find it across **all modules**, because modules other than Base also rewrite the dispatcher (for example a `Portfolio.Assessments` script):
   ```
   grep -rliE "(CREATE|ALTER)\s+PROC.*spBASE_GetCustomReportData" backend --include=*.sql   (exclude bin and obj, sort by timestamp)
   ```
   The newest by timestamp is the base. Several dispatcher scripts exist with close timestamps (for example the `*_Dispatcher.sql` family and `UpdateCustomReportDataProc`), and one script (`Update_CustomReport_Procedures_TimeZoneId_BASE`) is very large because it updates many procedures at once; read the dispatcher part, not the whole file. If the user pastes the live definition (`SELECT OBJECT_DEFINITION(OBJECT_ID('base.spBASE_GetCustomReportData'))`), diff it against the newest script and use the live one when they differ.
2. Add one line inside the `CASE`, at the bottom:
   ```sql
   WHEN 'Custom <X> Report'   THEN '<schema>.sp<Module>_Get<X>CustomReport'
   ```
3. Save as a new `Base/Scripts/<timestamp>_Alter_spBASE_GetCustomReportData_<X>.sql` with a Base migration wrapper. Keep the timestamp later than every existing dispatcher script.
4. Reference: `20261008090221_Alter_spBASE_GetCustomReportData_BuildingOpExVsLeaseExpense.sql`.

Known live gap (not ours to fix unasked): data set `Custom Scheduling Reports` has no `WHEN` branch, so its reports return `999`.

Order note: the dispatcher builds the procedure name as text and checks the target with `OBJECT_ID` at run time, so module migration order does not break creation. The procedure just has to exist by the time a report runs.

## 3. What the report author does in the UI

1. Reports page → create a new custom report, pick the new data source, pick columns, save.
2. Note the new `CustomReportId` from `base.CustomReports` (`SELECT CustomReportId, CustomReportName, ReportGroupId FROM base.CustomReports ORDER BY 1 DESC`).
3. Only now add criteria, if the report needs filters (Section 4).

## 4. Criteria (optional, after the report exists)

Criteria rows depend on a saved report id, so they cannot be seeded before someone creates the report. Two ways:

- **Manual or one-off**: insert after step 3 above.
- **Seeded**: a script that looks up the report by `CustomReportName` and inserts. Reference: `Base/Scripts/20260925130300_Replace_LeaseCommitment_CustomReports.sql` (see the `INSERT INTO base.CustomReportCriteria` block).

Shape of one criterion:

```
CustomReportCriteria: CustomReportId, UniqueId, AccountId, DataFieldId (a CR_CRITERIA_* field),
                      Label, Query, ReportDatasourceId, CustomDataFieldProperties
Query example: ' AND [AssessmentProjectUniqueId] IN @CR_CRITERIA_ASSESSMENT_PROJECT'
CustomDataFieldProperties example: [{"customDataFieldProperties": [{"uiControl":"dropdownmultiselect"}]}]
```

- The `@<DataFieldName>` token in `Query` is replaced by the report procedure's merge step (Migration 2, step 3). A criterion whose `DataFieldName` isn't handled there does nothing.
- The criterion's `DataFieldId` must exist in `base.DataFields` (look at existing `CR_CRITERIA_*` fields; add a new one in Migration 1 if needed).
- To move a configured report to another environment, use `dbo.spBase_GenerateCustomReportScripts(@TargetAccountId, @TargetUserId, @CustomReportIds)`. It scripts the saved report, columns and criteria.

## 5. Checklist (when asked to "add a custom report")

Collect first:
- Report name, `DataSourceName`, `DataSetName` (default `Custom <Name> Report`)
- Owning module and schema (decides where Migration 2 lives)
- `CloudCode`
- Column list: code, label, type, length
- Source tables, joins and the account-scoping column
- Time-zone parameters? Chart widgets? Site or Building custom fields? Criteria?

Then:
1. `grep -rn "<DataSetName>" backend --include=*.sql` to confirm the name is unused.
2. Find the closest existing report in the same module (in `Scripts` and `ScriptObjects`) and copy its procedure rather than starting blank.
3. Write Migrations 1, 2 and 3 in that order, each with its `.cs` wrapper and a unique, increasing timestamp.
4. For Migration 3, start from the newest dispatcher definition and add one `WHEN` line only; diff to confirm nothing else changed.
5. Do not run migrations or write to the shared dev database; the user applies them.
6. Final answer: purpose, files added, `DataSetName` consistency across the four places, what was not verified.

## 6. Verification (read-only SQL, run by the user)

```sql
-- data source and its fields
SELECT * FROM base.CustomDataSources WHERE DataSetName = 'Custom <X> Report';
SELECT df.DataFieldName, df.Label, df.DataFieldPosition
FROM base.DataFields df JOIN base.DataSet ds ON ds.DataSetId = df.DataSetId
WHERE ds.DataSetName = 'Custom <X> Report' ORDER BY df.DataFieldPosition;
-- dispatcher has the branch
SELECT CHARINDEX('Custom <X> Report', OBJECT_DEFINITION(OBJECT_ID('base.spBASE_GetCustomReportData')));  -- > 0
-- report proc exists and takes the time zone params only if intended
SELECT name FROM sys.parameters WHERE object_id = OBJECT_ID('<schema>.sp<Module>_Get<X>CustomReport');
-- a saved report end to end
SELECT * FROM base.CustomReportDataSources WHERE CustomReportId = <id>;
SELECT * FROM base.CustomReportColumns WHERE ReportDatasourceId = <ReportDatasourceId>;
SELECT * FROM base.CustomReportCriteria WHERE CustomReportId = <id>;
```

The user runs these in their own SQL client. Never ask for, store or type a database password.

## 7. Pitfalls seen in this repo

- **Dispatcher overwrite**: old copies drop newer data sets (see the comment inside the live procedure and the `Restore_Missing_DataSets` script).
- **Dispatcher edited from several modules**: take the newest by timestamp across all modules.
- **Name mismatch** between `DataSet`, `CustomDataSources`, the `CASE` and the procedure → `999` or an empty report.
- **Custom field label clashes**: label-keyed temp columns collide when two data sets share a label; the reference prefixes with `Building.` and `Site.`.
- **ScriptObjects** may hold the report procedure instead of `Scripts` (see Migration 2).
- Files in this repo are CRLF; match line endings when scripting edits.
- `bin/Debug/.../Scripts` copies of each script exist in every module's output; edit only `<Module>/Scripts`.
