# CropWatch

## Code Cleanliness
[![Maintainability](https://qlty.sh/gh/CropWatchDevelopment/projects/CropWatch/maintainability.svg)](https://qlty.sh/gh/CropWatchDevelopment/projects/CropWatch)
[![Code Coverage](https://qlty.sh/gh/CropWatchDevelopment/projects/CropWatch/coverage.svg)](https://qlty.sh/gh/CropWatchDevelopment/projects/CropWatch)
[![CI](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/ci.yml/badge.svg)](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/ci.yml)

## Code Security
[![Security](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/security.yml/badge.svg)](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/security.yml)
[![Vulnerabilities](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FCropWatchDevelopment%2FCropWatch%2Fbadges%2Fsnyk.json&logo=snyk)](https://github.com/CropWatchDevelopment/CropWatch/actions/workflows/security.yml)
[![Snyk security](https://snyk.io/test/github/CropWatchDevelopment/CropWatch/badge.svg)](https://snyk.io/test/github/CropWatchDevelopment/CropWatch)

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

## Configuring an environment

Every environment (development, staging/QA/UAT, production) is the same code
with a different set of env values: API base URL, Supabase project, Firebase
project, reCAPTCHA and Libellus keys. `.env.example` lists every key.

| Run                    | Command              | Env files loaded (all gitignored) |
| ---------------------- | -------------------- | --------------------------------- |
| local development      | `pnpm dev`           | `.env`, `.env.development`        |
| local, against staging | `pnpm dev:staging`   | `.env`, `.env.staging`            |
| production build       | `pnpm build`         | `.env`, `.env.production`         |
| staging build          | `pnpm build:staging` | `.env`, `.env.staging`            |

On Vercel, set the values per Vercel environment (Production / Preview /
Development) instead of files. `PUBLIC_APP_ENV` (`development` | `staging` |
`production`) names the environment explicitly; when it is unset the Vite mode
decides. The app reads env only through `$lib/config/public` and
`$lib/server/config`.

# Architecture

Pages are MVC with dependency injection; [CLAUDE.md](./CLAUDE.md) is the full
reference.

- **Model** — `src/lib/api/repositories`: one repository per API resource (an
  interface plus an HTTP implementation). Nothing else knows an API URL.
- **Controller** — `+page.server.ts` / `+layout.server.ts` / `+server.ts`, and
  `*.svelte.ts` controller classes for complex client state.
- **View** — `.svelte` components.
- **DI** — `hooks.server.ts` builds request-scoped `locals.services`; the root
  layout provides the browser's services through Svelte context
  (`getServices()`). Tests inject mocks the same way.

# Testing

```sh
pnpm test:unit        # unit + component tests (watch mode)
pnpm test:coverage    # one run with coverage (target ≥ 90 %, enforced in CI)
pnpm test:e2e         # Playwright, against the local mock API in scripts/e2e-stack.mjs
```

Tests never touch real data: `src/lib/testing/setup.ts` refuses every network
request a unit test did not fake, and the e2e stack serves its own mock API.

## Github README PROFILE CATEGORY

- [x] [Dashboard]()
- [x] [Locations]()
- [x] [Location Details]()
- [x] [Sensor Details]()
- [x] [Sensor Rules]()
- [x] [Sensor Settings]()
- [ ] [Sensor Compare]()
- [x] [Settings Page with notations]()
- [x] [Real-Time Updates]()

# List of Tools & Packages Used:

- PWA Framework: Svelte 5, SvelteKit 2 (Vercel adapter)
- UI Components: @cropwatchdevelopment/cwui, @cropwatchdevelopment/qr-scanner
- Styling: Tailwind CSS 4
- Mapping: MapLibre GL JS
- Localization: Paraglide (inlang)
- Auth & push: @supabase/supabase-js, Firebase Cloud Messaging
- Testing: Vitest (node + Playwright browser mode, v8 coverage), Playwright
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
