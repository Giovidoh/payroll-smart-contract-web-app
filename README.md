This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Tech Stack

### Core Framework

- **[Next.js](https://nextjs.org)** (v16.0.3) - React framework for production
- **[React](https://react.dev)** (v19.2.0) - UI library
- **[TypeScript](https://www.typescriptlang.org)** (v5) - Type-safe JavaScript

### Styling

- **[Tailwind CSS](https://tailwindcss.com)** (v4) - Utility-first CSS framework
- **[PostCSS](https://postcss.org)** - CSS processing tool
- **[tw-animate-css](https://github.com/nextui-org/tailwindcss-animate)** - Tailwind animation utilities
- **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** - Merge Tailwind classes intelligently
- **[class-variance-authority](https://cva.style)** - Build type-safe component variants
- **[clsx](https://github.com/lukeed/clsx)** - Utility for constructing className strings

### UI Components & Icons

- **[Shadcn UI](https://ui.shadcn.com)** - Shadcn UI
- **[Lucide React](https://lucide.dev)** - Icon library
- **[Sonner](https://sonner.emilkowal.ski)** - Toast notification component

### Form Management & Validation

- **[React Hook Form](https://react-hook-form.com)** - Performant form library
- **[Zod](https://zod.dev)** (v4.1.12) - TypeScript-first schema validation
- **[@hookform/resolvers](https://github.com/react-hook-form/resolvers)** - Validation resolvers for React Hook Form

### State Management & Data Fetching

- **[TanStack Query](https://tanstack.com/query)** (v5.90.8) - Powerful data synchronization for React
- **[Axios](https://axios-http.com)** - Promise-based HTTP client

### Authentication

- Custom authentication implementation with session management

### Internationalization

- **[next-intl](https://next-intl-docs.vercel.app)** (v4.5.3) - Internationalization for Next.js

### Theming

- **[next-themes](https://github.com/pacocoursey/next-themes)** - Dark mode support for Next.js

### Development Tools

- **[ESLint](https://eslint.org)** (v9) - Code linting
- **[eslint-config-next](https://nextjs.org/docs/app/building-your-application/configuring/eslint)** - Next.js ESLint configuration
- **[@tanstack/eslint-plugin-query](https://tanstack.com/query)** - ESLint plugin for TanStack Query

## Getting Started

First, install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── [locale]/          # Internationalized routes
│   └── api/               # API routes
├── components/            # React components
│   └── ui/               # UI component library
├── features/             # Feature-based modules
│   └── auth/             # Authentication feature module
├── i18n/                 # Internationalization configuration
├── lib/                  # Utility functions and helpers
│   └── apis/             # API client configurations
├── messages/             # Translation files
├── providers/            # React context providers
└── styles/               # Global styles
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
