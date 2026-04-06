# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv create --template demo --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:vercel" devtools-json mcp="ide:vscode+setup:remote" --install pnpm CropWatch
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

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
- [X] [Real-Time Updates]()

# List of Tools & Packages Used:
- PWA Framework: Svelte, SvelteKit
- UI Components: @cropwatchdevelopment/cwui, bits-ui, @revolist/svelte-datagrid
- Styling: Tailwind CSS, @layerstack/tailwind, @tailwindcss/forms, @tailwindcss/typography
- State Management: @stencil/store
- Data Visualization: D3.js, ApexCharts
- Mapping: Leaflet
- PDF Generation: jspdf, pdfkit, html2canvas
- Localization: svelte-i18n,
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
