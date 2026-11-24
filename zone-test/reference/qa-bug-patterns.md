# How the zOne QA team finds bugs

Source: the 52 bugs under User Story 20308 (ODOT Feedback, Tile View in Real Property and related work). Use this list to counter-check a feature before QA does. Every pattern below is a case family to design in `feature` step 3 and to look for in `qa`. Cite the pattern's bug ids only as examples, never as expected results for another feature.

## How QA writes a bug

- Title is the whole report: `<Env> - <Module> - <View> - <Screen/Tab> - <Menu/Action> - <what is wrong or what is expected>`, for example `Real Property - Tile View - Lease Items - Add Location - tooltip should be implemented`. Repro, expected and actual are usually missing, so write yours in full.
- Found by walking the screen in the browser, option by option, comparing against the grid view, a sibling tab or the design system. Most bugs need no data tricks, only careful looking.
- One finding is often copied to every sibling screen (for example the scrollbar bug on CAD Plans, then Reminders, then Amendments). Fix and test the family, not one screen.
- Some reports turn out to be "cannot reproduce" or a data-setup mistake (a lease type not opened, a Text field instead of a Currency field, a different user's location access). State the exact precondition data and field types in every case so nobody wastes time on it.

## Patterns to test for every feature

1. **Menu content.** Section headings such as "Lease", "Others" or "Payment" look like disabled items; options shown disabled that should be enabled (or the reverse); labels that differ from the grid view (`Payment` against `Payments`); missing items the grid view has; wrong order of tabs (Payment Schedules before Payments); every menu and sub-menu item opens the right page or modal.
2. **Parity with the old view.** Whatever the grid view offers (columns, tabs, actions, privileges, list view, files list view, search, advanced search fields, status filters, reports) must exist and match in the new view, and bugs found in one view are checked in the other.
3. **Units and symbols.** Area, amount and cost labels carry their unit in brackets or beside the value; additional data fields of type Currency show the currency symbol; amounts are not missing in grids or generated reports; amounts are right-aligned (check with Number, Decimal and Currency fields, not Text).
4. **Scrollbars.** The horizontal scrollbar sits at the bottom of the page or panel, not at the end of the data; same check on every grid-like page (CAD Plans, Reminders, Amendments and any other).
5. **Modals and navigation.** Pages and modals open from the right entry point (Add Location opens the Add Location page), close after an item opens, never open blank (Edit Sublease, edit from the more menu), never open behind another popup (z-index), and the page behind refreshes.
6. **Details panel.** Header and detail fields are not duplicated without need; detail fields belong to the selected record type (a sublease shows sublease fields, not lease fields); status such as Expired is visible in the list tile; the left list updates when searching; list view and tile view both render.
7. **Tooltips and affordances.** Icon-only and "Add" buttons have tooltips; disabled controls say why.
8. **Business rules, in the menu and in the workflow.** A rule enforced by disabling a menu item is also enforced on the next page and by the API (Area and Cost disabled for active leases yet editable through the edit workflow); no "Can Sublease" on a sublease; no sublease of a sublease; Sublease option disabled where unsupported.
9. **Validation.** Blank mandatory fields show a message on Next and Save; import messages do not call present fields missing; maximum-length and out-of-range input gives the right message and result; dependent dropdowns clear when the parent changes (Site after Region or District) and list options when the parent is empty if the design says so.
10. **Cascading data.** A dropdown is filtered by the earlier selection (Equipment by Location); saved and updated child records persist after save and reload (Plans locations).
11. **Deleted and changed entities.** Deleted users cannot be added to reminders or assignments; a location deleted from an item can be added again; messages such as "already leased" or "cannot be subleased" do not appear for valid states.
12. **Same feature in every flow.** A behaviour added to one flow (auto-select assigned users, auto-populate Assigned To) is tested in each flow that has the entity: create, review, complete and close, single and multiple redirect.
13. **Roles.** Each role signs in and sees its own screens; no "Unauthorized Access" for a role that has the privilege; menu items and buttons follow the privilege.
14. **Reports and exports.** Custom and generated reports show the new fields (Site, Building, Region, District), group readably (no congested multi-value cells), and amounts and units are present.
15. **Audit.** Add, edit and delete actions write Activity Log entries.
16. **Layout and alignment.** Images, tiles and fields are aligned and readable; popups show every additional data field.

## What a bug report from you must contain

Title in the QA format above, preconditions (record type, field types, user and role, data state), numbered steps, expected, actual, screenshot, and `existing` or `new`. Mark a missing-parity item or a design question as a suggestion, not a defect.
