# Build it so QA finds nothing

Source: the 52 bugs QA raised under User Story 20308 (ODOT Feedback, Tile View in Real Property and related work). Each rule below is a mistake that reached QA. Apply the rules that fit the feature while you plan and build, so the same bug is never raised again. Bug ids are examples only.

QA finds bugs by walking each screen option by option and comparing it with the old view, a sibling tab and the design system. Most bugs are visible without special data. They are also copied across sibling screens, so a rule applies to every screen of the same kind, not just the one you are building.

## Before designing: list what must match

- The **old view** of the same module (for a new tile view, the grid view). List every column, tab, menu item, action, filter, search field, status filter, report, list view and privilege it has. The new screen has all of them, with the same names and order, unless the user decides otherwise. (21136, 21137, 21138, 21139, 21306, 21278, 21292)
- **Sibling screens** that share the pattern (every grid-like tab or page in the module). Anything you build into one, build into all. (21142, 21148, 21300)
- **Every flow that touches the same entity** (create, review, edit, complete and close, single and multiple actions, redirect). A behaviour added to one flow is added to each. (21201, 21204, 21379, 21383)
- **Record types.** Lease, sublease, amendment and any other type the screen shows each have their own fields, rules and menu items. (21150, 21169, 21175)

## Menus, tabs and labels

- Group headings in a menu must look different from items, so they never read as disabled options. (21127)
- Disable or hide an item only when the rule says so, and give a tooltip saying why. A valid action is never shown disabled. (21138)
- Labels match the old view and the data (`Payments`, not `Payment`). Tab order follows the workflow. (21137, 21139)
- Do not repeat in a details tab what the header already shows unless a requirement says so. (21133)
- Make status visible in the list item, an Expired state especially. (21130)
- Every icon-only button and every Add button has a tooltip. (21145)

## Values, units and alignment

- Amounts and areas show their unit or currency symbol, in the label or beside the value. Additional data fields of Currency type show the symbol too. (21128, 21141, 21144)
- Amounts appear in every grid and generated report. Right-align numeric, decimal and currency values. (21146, 21147)
- Show empty and default values deliberately: never `null`, `undefined`, `NaN`, `Invalid Date` or `01 Jan 1970` where the value is unset.
- Images, tiles and fields line up and stay readable at supported widths. Popups show every additional data field. (21343, 21344)

## Scrolling, pages and modals

- A horizontal scrollbar sits at the bottom of its page or panel, not at the end of the data; a scrollbar exists only when content overflows, on one element only. (21142, 21148, 21300)
- Each modal or page opens from the right entry point, never blank, never behind another popup (check z-index), and closes when it hands over to another page. After a save or close, the page behind refreshes. (21134, 21143, 21178, 21385)
- Search, filter and sort refresh the list on the left and keep the selection sensible. List view and tile view both render. (21129, 21306)

## Business rules

- Enforce each rule in the menu, on the next page of the workflow and in the API. Disabling a menu item alone is not enforcement. (21164)
- Write down the allowed states per record type (no Can Sublease on a sublease, no sublease of a sublease, Area and Cost locked on active leases) and build and test each one. (21169, 21175, 21164)
- Every mandatory field shows a message on Next and Save. Import messages report only fields that are really missing. Maximum-length and out-of-range input gives the right message and result. (21275, 21276, 21294)
- Dependent dropdowns clear when the parent changes, and list the options the design says when the parent is empty. A child dropdown shows only what the parent selection allows. (21272, 21273, 21342)
- Saved changes survive save and reload. (21341)
- Deleted users, locations and records cannot be chosen, and a deleted item can be added again. No "already leased" or "cannot be subleased" message for a valid state. (21149, 21421, 21423)

## Access, reports and audit

- Check every role that can reach the screen. A role with the privilege never sees "Unauthorized Access". Menu items and buttons follow privileges, which are seeded and registered. (21222)
- New fields (Site, Building, Region, District) reach custom reports and generated reports. Grouped values read cleanly, not as one crowded cell. (21195, 21147)
- Add, edit and delete write Activity Log entries. (21299)

## Before you say it is done

Walk the finished screen like QA: open every menu, sub-menu, tab, modal and report; compare with the old view and with each sibling screen; check units, alignment, scrollbars, tooltips and messages; try each role and each record type; repeat after deleting and re-adding. Record each rule above as met, not applicable (with the reason) or not verified.
