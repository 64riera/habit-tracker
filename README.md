This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Running with Docker

Requires a `.env.local` file to exist (the same one you use in development, with `APP_JWT_SECRET`). Authentication is per-account (username/password, `/signup`), not via environment variable.

```bash
docker compose up --build
```

This builds the image, applies the migrations from `drizzle/` against a SQLite database inside the persistent `just-go-data` volume, and starts the app at [http://localhost:3000](http://localhost:3000). Data survives `docker compose down` and image rebuilds; it's only lost with `docker compose down -v`.

If you'd rather use remote Turso instead of the volume's local SQLite, define `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` in `.env.local` and remove the `TURSO_DATABASE_URL` variable from `docker-compose.yml`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
