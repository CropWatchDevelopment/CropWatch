# Rule Trigger History

The "View History" dialog on the Rules page shows, for one rule template, every time
that rule **triggered** on a device and when it later **reset**. It answers: "When did
this alarm fire, on which sensor, what value tripped it, and how long did it stay in
alarm?"

Each row in the log is one **episode**: a trigger event paired with its matching reset
(or no reset yet, meaning the alarm is still active). A single rule template can watch
many devices, so episodes from different devices are interleaved in one chronological
list.

## Where it lives

| Layer | File |
|---|---|
| Dialog component | `src/routes/rules/ViewRuleAlertHistory.svelte` |
| Invoked from | `src/routes/rules/+page.svelte` (row action: `<ViewRuleAlertHistory templateId={row.id} ruleName={row.name} />`) |
| Frontend API call | `ApiService.getRuleTemplateHistory(id)` in `src/lib/api/api.service.ts` |
| DTO | `RuleTriggerLogDto` in `src/lib/api/api.dtos.ts` |
| Backend handler | `RulesNewService.getHistory()` in `api/src/v1/rules-new/rules-new.service.ts` |
| Backend DTO | `api/src/v1/rules-new/dto/rule-trigger-log.dto.ts` |
| Source table | Postgres `cw_rule_trigger_log` |
| i18n keys | `rules_new_history_*` and `rules_new_view_history` in `messages/{en,ja}.json` |

## Data model

`cw_rule_trigger_log` (one row per episode), surfaced as `RuleTriggerLogDto`:

| Field | Meaning |
|---|---|
| `id` | Episode id (used as the `{#each}` key) |
| `devEui` / `deviceName` | The device the rule fired on; `deviceName` resolved server-side, may be null |
| `templateId` | Owning rule template |
| `triggeredAt` / `triggeredValue` | When the condition was first met, and the reading that met it |
| `resetAt` / `resetValue` | When the condition cleared, and the reading at reset. **Null = still active** |
| `createdAt` | Row creation timestamp (not displayed) |

**Active vs resolved is derived purely from `resetAt`:** `resetAt == null` ⇒ active.

## Data flow

1. The history icon button calls `openHistory()`, which opens the dialog and, on first
   open per `templateId`, calls `loadHistory()`. (`loadedFor` guards against re-fetching
   the same template; loading from the click handler avoids a load-triggering `$effect`.)
2. `getHistory()` on the backend:
   - Reuses `findOne()` so a hidden/non-existent template returns 404, not an empty list.
   - Restricts rows to devices the caller **can view** (`viewableDevices`), then resolves
     `deviceName` from the managed-device list.
   - Orders by `triggered_at DESC` and caps at **200 rows**.
3. The component renders the returned episodes.

## The UI (redesign, 2026-06)

The list is a vertical **timeline per episode**:

- **Card left border** encodes overall status — red (`--cw-danger-500`) for active,
  green (`--cw-success-500`) for resolved.
- **Card header**: device name + a status chip (`Active` danger / `Resolved` success).
- **Timeline body**: a two-marker vertical track —
  - top dot = `Triggered` (time + tripping value),
  - connector line carrying the **duration** label in the middle,
  - bottom dot = `Reset` (time + reset value) for resolved, or `Still active` for active.
- **Duration**: resolved episodes show `Lasted <span>` using `formatDuration()`; active
  episodes show `Active for` + a live-ticking `<CwDuration from={triggeredAt} />`.
  `formatDuration()` deliberately mirrors CwDuration's compact format (`13h 30m`,
  `2d 04h`, `45m 12s`) so static and live durations read identically.
- **Summary chips** above the list: a danger "N active now" chip (when any are active)
  and a "N events" total.
- **Device filter**: a compact `CwDropdown` (shown only when the rule spans more than one
  device) with an "All devices" option plus one per device, filtering `filteredEntries`.

### Why it was changed

The previous layout placed the trigger on the far left, the device name small in the
top-right corner, and the reset/"Still active" on the far right with large empty gaps.
Problems it had: the trigger→reset relationship and **how long the alarm lasted were not
shown**; interleaved devices were hard to track because the device label was de-emphasized
and there was no per-device filter; the content was flung to both edges because the dialog
**inherits `text-align: right`** from the table action cell it mounts in (`.rule-history`
now pins `text-align: left`); and it hard-coded hex color fallbacks (`#dc2626`, etc.),
violating the [CWUI-first style contract](./cwui-first-style.md).

The redesign makes each episode a self-contained timeline, surfaces duration, adds the
per-device filter and an active-count summary, and uses only CWUI design tokens.

## Conventions & gotchas

- **No hard-coded colors.** All colors come from CWUI tokens (`--cw-danger-500`,
  `--cw-success-500`, `--cw-text-muted`, `--cw-border-muted`, `--cw-bg-surface`, …). Local
  CSS handles layout only, per the style contract.
- **i18n.** Every visible string is a `m.rules_new_history_*` key in both `en.json` and
  `ja.json`. Add new strings to both. `{duration}` is pre-formatted; `{count}` is stringified.
- **200-row cap & ordering** are backend concerns (`getHistory`). The component does not
  paginate; if history needs to grow beyond 200, add paging there first.
- **Value units.** `triggeredValue`/`resetValue` are raw numbers — the rule's metric/unit
  is not part of the DTO, so values render unit-less. If units are wanted, plumb them
  through `RuleTriggerLogDto` from the rule template.
- **Device visibility** is enforced server-side; the client trusts the returned set.

## Verifying changes

1. `pnpm check` (svelte-check) — must stay at 0 errors.
2. Run the Svelte MCP `svelte-autofixer` on the component until it reports no issues.
3. `pnpm dev`, open the Rules page, click the history icon on a multi-device rule
   (e.g. a tunnel-freezer temperature rule). Confirm: active episodes show a live-ticking
   "Active for" duration and a red border; resolved episodes show "Lasted …" and a green
   border; the device filter narrows the list; the summary counts match.

To exercise it against real data, query `cw_rule_trigger_log` for a template with a mix of
active and reset rows (templates with `reset_at IS NULL` rows have active episodes).
