# Dashboard Current-State Notes

This file captures the dashboard behavior that existed before the reset.

## Route and shell behavior

- The dashboard lived at `/`.
- The root layout treated `/` as a special case and skipped its normal app-context sync when page data contained a streamed `dashboard` promise.
- The sidebar showed dashboard-only filters on `/`:
  - device group
  - location group
  - location
- The shell rendered a bottom overview drawer on all authenticated pages, but the drawer content depended on dashboard-loaded status and alert data.

## Main dashboard UI

- The page had two mutually exclusive views:
  - `table`
  - `sensor-cards`
- The selected view persisted in `localStorage` under `cropwatch.dashboard.view`.
- On mobile widths, the page defaulted to sensor cards unless a stored preference existed.

## Sensor-card mode

- Sensor cards grouped devices by location.
- A second persisted preference controlled card layout:
  - `grid`
  - `masonry`
- The selected layout persisted in `localStorage` under `cropwatch.dashboard.cardLayout`.
- Cards supported:
  - location navigation
  - device-detail navigation
  - per-device expand/collapse
  - expanded detail-row loading from `/devices/{dev_eui}/latest-data`
  - background refresh timers per visible device
  - infinite-scroll style location batching
  - persisted expand state via CWUI sensor-card storage keys

## Table mode

- The table used `CwDataTable`.
- Search, sorting, pagination, grouping, and refresh were handled inside the table.
- The table grouped rows by location unless privacy mode was enabled.
- The page exposed an extra toggle that turned virtual scrolling on and off.
- Table rows supported direct navigation to the device detail page.
- Last-seen cells used `CwDuration` and could trigger row refreshes.

## Data and filtering behavior

- The route streamed a single `dashboard` payload promise from `+page.server.ts`.
- The page manually unpacked the resolved payload and pushed it into global `AppContext`.
- The payload merged several API sources:
  - latest primary device data
  - full device metadata
  - device types
  - device groups
  - location list
  - location groups
  - device online/offline summary
  - triggered rules
  - triggered rule count
- The server also performed extra per-device requests for data tables not covered by the bulk latest-primary endpoint.
- URL search params controlled page filters:
  - `group`
  - `locationGroup`
  - `location`
- The table and card views each layered their own filtering/query logic on top of the shared URL filter state.

## Loading, empty, and navigation behavior

- The whole dashboard showed a large centered spinner while the streamed payload was unresolved.
- A secondary "loading view" placeholder appeared while browser-only view preferences were still being restored.
- Sensor-card mode had an empty state for no matching locations.
- Table mode relied on `CwDataTable` empty/error behavior.
- Device detail navigation targeted `/locations/[location_id]/devices/[dev_eui]`.
- Location navigation targeted `/locations/[location_id]`.

## Bottom overview drawer

- The overview drawer summarized:
  - online devices
  - offline devices
  - active alerts
- It also rendered a donut chart and a list of triggered rules with timestamps.
- The drawer depended on dashboard-loaded data stored in global app context.

## Known technical problems in the old implementation

- Dashboard state was split across:
  - route load data
  - page-local state
  - root layout sync logic
  - global app context
  - component-local refresh/expand managers
- The route and shell were tightly coupled:
  - sidebar filters depended on dashboard-only context fields
  - the overview drawer depended on dashboard-only context fields
  - the root layout had a `/`-specific sync exception
- The dashboard had duplicated filtering/search/sort concepts in multiple places.
- Sensor-card mode contained several layers of extra machinery:
  - device-type lookup resolution
  - expanded-row caching
  - rate-limited re-fetch logic
  - per-device background refresh alarms
  - infinite-scroll prefetch logic
  - wheel-event scroll passthrough
- The dashboard test suite was not clean:
  - `dashboard-device-data.spec.ts` already had a failing assertion
  - the repo typecheck already failed on duplicate keys in dashboard specs
- The repo-wide typecheck also had unrelated failures outside the dashboard area, so the previous baseline was already dirty before the reset.
