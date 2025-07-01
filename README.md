<h1 align="center">CropWatch Web UI</h1>
<p align="center"><i>Our PWA Web Application for viewing and controlling your farm from anywhere and everywhere.</i></p>
<div style="display:flex; flex-direction: row; gap: 5px;" align="center">
  
  [![CodeQL - Master](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/github-code-scanning/codeql/badge.svg?branch=master)](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/github-code-scanning/codeql)
  [![CodeQL - Develop](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/github-code-scanning/codeql/badge.svg?branch=develop)](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/github-code-scanning/codeql)
  [![codecov](https://codecov.io/gh/CropWatchDevelopment/CropWatch/graph/badge.svg?token=H0LAIQ38KG)](https://codecov.io/gh/CropWatchDevelopment/CropWatch)

</div>
<br>
<p align="center"><i>Loved the project? Please visit our <a href="https://CropWatch.io">Website</a></i></p>
<br>

## About CropWatch Web UI
CropWatch Web UI is a progressive web application (PWA) built with SvelteKit, designed for farmers, agronomists, and farm managers to monitor and control their farm operations remotely.
It aggregates sensor data from soil and air devices, visualizes key metrics, and enables custom rule-based alerts to streamline decision-making.

### Key Features
- **Dashboard**: Customizable data cards and interactive charts for real-time insights.
- **Mapping**: Geospatial views of sensor locations using Leaflet.
- **Alerts & Rules**: Configure thresholds to trigger push notifications and highlight anomalies.
- **PDF Reports**: Export detailed device and trend reports via jsPDF and html2canvas.
- **Localization**: Multi-language support with svelte-i18n for English, Spanish, and Japanese.

### How It Works
1. Field sensors collect environmental and soil metrics and send them to a Supabase backend.
2. The UI uses @supabase/supabase-js for data retrieval and @supabase/ssr for server-side rendering.
3. Reactive Svelte stores (@stencil/store) manage state and update UI components dynamically.
4. Users define rules in the UI; when sensor data crosses thresholds, the system highlights issues in real time.
5. On-demand PDF generation allows exporting reports for offline sharing or record-keeping.

### Why Contribute?
We welcome contributions from developers, designers, and farmers alike to make CropWatch more robust and user-friendly:
- Enhance existing UI components or add new visualizations.
- Integrate new sensor types or third-party services.
- Improve performance, accessibility, and test coverage.
- Translate the application into additional languages.

Fork the repo, create a branch with your feature or fix, and submit a pull request. See the [Contribute](#contribute) section below for details.

This repo aims to host a UI that everyone can update and add to so that we can make farming as easy as possible through the use of technology.

If you are interested, please create a PR to add your `README` profile here.

If you like this Repo, please click the :star:

List of `CropWatch UI` categories mentioned below

## Contents
  - [Contribute](#contribute)

## Website

Link : https://app.CropWatch.io

<a href="https://app.CropWatch.io">Current Production UI</a>

# Environments
- [UAT](https://crop-watch-i2xiyd6mo-crop-watch-team.vercel.app/)
- [PROD](https://app.cropwatch.io)
- [QA](https://app-qa.cropwatch.io)
- [DEV](http://localhost:5173)

## Github README PROFILE CATEGORY

- [x] [Dashboard]()
- [x] [Locations]()
- [x] [Location Details]()
- [X] [Sensor Details]()
- [X] [Sensor Rules]()
- [X] [Sensor Settings]()
- [ ] [Sensor Compare]()
- [ ] [Settings Page with notations]()
- [-] [Push Notifications]()
- [-] [Real-Time Updates]()

# List of Tools & Packages Used:
- PWA Framework: Svelte, SvelteKit
- UI Components: @cropwatchdevelopment/cwui, bits-ui, @revolist/revogrid, @revolist/svelte-datagrid
- Styling: Tailwind CSS, @layerstack/tailwind, @tailwindcss/forms, @tailwindcss/typography
- State & IoC: @stencil/store, inversify
- Data Visualization: D3.js, ApexCharts
- Mapping: Leaflet
- PDF Generation: jspdf, pdfkit, html2canvas
- Localization: svelte-i18n, @inlang/paraglide-js
- Backend & SSR: @supabase/supabase-js, @supabase/ssr
- Routing & Testing: Vite, Vitest, Playwright, @playwright/test, @testing-library/svelte, @testing-library/jest-dom
- Linting & Formatting: ESLint, Prettier, eslint-plugin-svelte, prettier-plugin-svelte, prettier-plugin-tailwindcss
- Build Tools: pnpm, TypeScript, Vite

# Chat, collaberate, and learn at our `community pages` Here:
- <a href="https://kb.CropWatch.io">CropWatch WIKI</a>
- <a href="https://forum.CropWatch.io">CropWatch Forum</a>
- <a href="https://discord.gg/fXHUpx6G">Join our Discord Server</a>

# Contribute

Contributions are always welcome! Please create a PR to add your GitHub profile.

# Debugging Server Side code using VSCode:
- Press: Ctrl + Shift + P, Then choose "Debug: JavaScript Debug terminal" from the prompt.
- In the terminal box that opens, type: pnpm dev
- Set your breakpoint and run the code!

# Issues

I love knowing when something is wrong, that way I can fix it ASAP! However, please take care when submitting an issue, be clear about what is wrong, what you did to make it happen, and if possible include your device and browser where it happened.

## :pencil: License

This project is licensed under [MIT](https://opensource.org/licenses/MIT) license.

## :man_astronaut: Show your support

Give a ⭐️ if this project helped you!
