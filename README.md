# SanskritVoyager

This repository contains the frontend of the Sanskrit Voyager web application, accessible at:  www.sanskritvoyager.com

The React application is built with TypeScript, Vite, and Mantine UI. The codebase is organized with configuration files at the root level, static assets in `public/`, and all source code contained within the `src/` directory. 

The source code is divided into  components for reusable UI elements, pages for route-level components, types for TypeScript definitions, utils for shared functionality, and specialized folders for context, hooks, and assets.

**ClickableSimpleBooks** - The core component located in `src/components/ClickableBooks/` that renders Sanskrit text with interactive word-level functionality, allowing users to click on any word to access dictionary entries and linguistic analysis.

**AdvancedSearch** - A search interface in `src/components/` that enables complex queries across the Sanskrit text corpus with filtering and result management capabilities.

**HeaderSearch** - A search component providing quick text search functionality accessible from the application header.

**DictionaryEntry** - Handles the display of detailed lexical information from the Monier-Williams dictionary when users interact with Sanskrit words.

**WordDataComponent** - Manages the presentation of morphological and etymological data for individual Sanskrit terms.

**BookSelect** - Provides the interface for users to choose from the collection of over 200 Sanskrit texts stored in `public/resources/books/`.

**TranslationControl** - Manages transliteration scheme switching between Devanagari, IAST, Harvard-Kyoto, and other writing systems.

**NavbarSimple** - The main navigation component that provides site-wide navigation and branding.

The Mantine UI theme configuration is centralized in `src/theme.ts`, which defines the application's color palette, typography, spacing, and component styling. This theme system ensures visual consistency across all components while supporting both light and dark modes through the ColorSchemeToggle component.

## Project Structure

```
SanskritVoyager/
├── README.md                    # Project documentation
├── package.json                 # Dependencies and scripts
├── package-lock.json           # Dependency lock file
├── yarn.lock                   # Yarn dependency lock file
├── tsconfig.json               # TypeScript configuration
├── vite.config.mjs             # Vite build configuration
├── vitest.setup.mjs            # Vitest testing setup
├── vercel.json                 # Vercel deployment configuration
├── postcss.config.cjs          # PostCSS configuration
├── index.html                  # Main HTML entry point
├── styles.css                  # Global styles
├──
├── public/                     # Static assets
│   └── resources/
│       ├── MWKeysOnly.json     # Dictionary keys
│       ├── normalized_entries.json # Normalized dictionary entries
│       └── books/              # Sanskrit text collections
│           ├── Boja.json
│           ├── Goraksasataka.json
│           ├── Yogataravali.json
│           └── [200+ Sanskrit texts...]
├──
├── src/                        # Source code
│   ├── main.tsx               # Application entry point
│   ├── App.tsx                # Main App component
│   ├── Router.tsx             # Application routing
│   ├── styles.css             # Component styles
│   ├── theme.ts               # Theme configuration
│   ├── vite-env.d.ts          # Vite environment types
│   ├──
│   ├── components/            # Reusable UI components
│   │   ├── AdvancedSearch.tsx
│   │   ├── AdvancedSearch.module.css
│   │   ├── BookSelect.tsx
│   │   ├── ClickableWords.tsx
│   │   ├── DictionaryEntry.tsx
│   │   ├── HeaderSearch.tsx
│   │   ├── InflectionTable.tsx
│   │   ├── NavbarSimple.tsx
│   │   ├── TranslationControl.tsx
│   │   ├── WordDataComponent.tsx
│   │   ├── WordInfo.tsx
│   │   └── [Additional UI components...]
│   ├──
│   ├── pages/                 # Page components
│   │   ├── Home.page.tsx
│   │   └── HomePage.module.css
│   ├──
│   ├── context/               # React contexts
│   │   └── ResponsiveContext.tsx
│   ├──
│   ├── hooks/                 # Custom React hooks
│   │   └── useHeadroom.tsx
│   ├──
│   ├── types/                 # TypeScript type definitions
│   │   ├── bookTypes.ts
│   │   ├── searchTypes.ts
│   │   ├── wordInfoTypes.ts
│   │   └── wordTypes.ts
│   ├──
│   ├── utils/                 # Utility functions
│   │   ├── Api.tsx
│   │   ├── apiService.tsx
│   │   ├── filter_data.json
│   │   └── localStorageColorSchemeManager.tsx
│   ├──
│   ├── fonts/                 # Custom fonts
│   └── svg/                   # SVG assets
│       ├── faviconbackground.png
│       ├── favicondark.svg
│       └── faviconlight.svg
├──
├── build/                     # Production build output
├── dist/                      # Distribution files
├── node_modules/              # Dependencies
├── temp_analysis/             # Temporary analysis files
└── test-utils/                # Testing utilities
    ├── index.ts
    └── render.tsx
```

## Features

This application comes with the following features:

- [PostCSS](https://postcss.org/) with [mantine-postcss-preset](https://mantine.dev/styles/postcss-preset)
- [TypeScript](https://www.typescriptlang.org/)
- [Storybook](https://storybook.js.org/)
- [Vitest](https://vitest.dev/) setup with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- ESLint setup with [eslint-config-mantine](https://github.com/mantinedev/eslint-config-mantine)

## npm scripts

## Build and dev scripts

- `dev` – start development server
- `build` – build production version of the app
- `preview` – locally preview production build

### Testing scripts

- `typecheck` – checks TypeScript types
- `lint` – runs ESLint
- `prettier:check` – checks files with Prettier
- `vitest` – runs vitest tests
- `vitest:watch` – starts vitest watch
- `test` – runs `vitest`, `prettier:check`, `lint` and `typecheck` scripts

### Other scripts

- `storybook` – starts storybook dev server
- `storybook:build` – build production storybook bundle to `storybook-static`
- `prettier:write` – formats all files with Prettier