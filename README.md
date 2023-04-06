# Level Liquidity Provider Tracker

[LevelFinance](https://level.finance) Liquidity Provider Performance tracking tool.

## What's inside?

This turborepo uses [pnpm](https://pnpm.io) as a package manager. It includes the following packages/apps:

### Apps

- `llp-tracker-ui`: LLP tracker frontend
- `llp-performance-snapshot`: Subgraph to track LLP performance
- `llp-performance-aggregate-worker`: Collect and aggregate data from subraph
- `llp-performance-aggregate-api`: API query aggregated LLP performance data

### Utilities

This turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```sh
cd llp-tracker
pnpm run build
```

### Develop

To develop all apps and packages, run the following command:

```sh
cd llp-tracker
pnpm run dev
```

To develop single apps, run the dev command with filter. Eg, to run frontend app

```sh
pnpm -F llp-tracker-ui dev
```

[Learn more](https://turbo.build/repo/docs/core-concepts/monorepos/filtering) about filtering

## Useful Links

- [Level finance app](https://app.level.finance)
- [LLP tracker app](https://llp.level.finance)

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
