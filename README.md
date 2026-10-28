# careOS

careOS is a cardiology practice app with two portals that share one record:

- **Doctor portal** for Dr. Irfan Ameerudden, general practitioner: schedule, patient search, charts, consults, orders, and analytics.
- **Patient portal** for Noor Yadallee: appointments, prescriptions, vitals, history, imaging, and billing.
- **Cardiologist account** for Dr. Sarah Jensen, used to test referrals.

The seeded clinic day is **17 November 2024**. Dates in the app are relative to that day.

## Prerequisites

Install these before the steps below.

| Tool | Version | Used for |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 20.19 or newer, or 22.12 or newer | The app and the seed script |
| npm | Comes with Node.js | Installing packages |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Current stable | Postgres 17 |

Confirm the tools are on your PATH:

```sh
node -v
npm -v
docker --version
```

Start Docker Desktop and wait until it reports that the engine is running. The database step fails if Docker is stopped.

## Install

From the project folder:

### 1. Install packages

```sh
npm install
```

### 2. Create the environment file

The app and the seed script both read `DATABASE_URL` from `.env`. That file is not committed.

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

**macOS and Linux:**

```sh
cp .env.example .env
```

The default connection string is:

```text
DATABASE_URL=postgres://clinica:clinica@localhost:5434/clinica
```

Leave it as-is for a local Docker database. The user, password, database name, and host port match `docker-compose.yml`.

### 3. Start Postgres

```sh
npm run db:start
```

This runs `docker compose up -d --wait`. The first run downloads the `postgres:17` image. The command returns when Postgres accepts connections. The database is published on **localhost port 5434** (container port 5432).

### 4. Create the tables and demo data

```sh
npm run db:setup
```

This applies `src/lib/server/schema.sql`, then loads the demo clinic: doctors, Noor’s chart, appointments, prescriptions, labs, imaging, vitals, and billing. It prints `Seeded CareOS on the 17 Nov 2024 clinic day.` when it finishes.

Running it again wipes the `public` schema and reseeds from scratch. Use that when you want a clean demo.

## Run the app

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You land on the sign-in page.

Stop the server with `Ctrl+C`. Postgres keeps running in Docker until you stop the container:

```sh
docker compose down
```

The database files stay in Docker’s volume, so the next `npm run db:start` brings the same data back. To delete that data as well:

```sh
docker compose down -v
npm run db:start
npm run db:setup
```

## Sign in

The demo accounts use the password `clinic-demo`.

| Portal | Email | Button on the sign-in page |
| --- | --- | --- |
| General practitioner | `irfan.ameerudden@clinica.privata` | Continue as Dr. Irfan Ameerudden |
| Patient | `noor.yadallee@clinica.privata` | Continue as Noor Yadallee |
| Cardiologist | `sarah.jensen@clinica.privata` | Continue as Dr. Sarah Jensen, cardiologist |

The doctor can also open Noor’s portal from inside the clinic. Sign out from the profile page, or visit `/logout`.

## Open it on a phone on the same network

The phone and the computer must be on the same Wi-Fi. Start the dev server so it listens on the LAN:

```sh
npm run dev -- --host
```

Vite prints a Network URL, for example `http://192.168.100.47:5173/`. Open that address on the phone. Use the address on your Wi-Fi adapter. Ignore virtual adapters such as VirtualBox (`192.168.56.x`) or WSL (`172.x`).

On Windows, if the phone cannot connect, allow Node.js through the firewall for private networks.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 5173 |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally. Postgres must still be running and `.env` must be present |
| `npm run check` | Type-check the project |
| `npm run db:start` | Start Postgres and wait until it is ready |
| `npm run db:setup` | Recreate the schema and demo data |
| `npm run db:studio` | Open Drizzle Studio against `DATABASE_URL` |

`db:generate`, `db:migrate`, and `db:push` are for Drizzle schema work. A normal install uses `db:setup`, which loads `src/lib/server/schema.sql` directly.

## Production build

```sh
npm run build
npm run preview
```

The preview server still needs the database from the install steps. Deployment uses `@sveltejs/adapter-vercel`. The Vercel Neon integration sets `DATABASE_URL` to the pooled connection. Drizzle migrations use `DATABASE_URL_UNPOOLED`.

## Troubleshooting

**`DATABASE_URL is not set`**

`.env` is missing or does not contain `DATABASE_URL`. Repeat step 2. The variable name must be exactly `DATABASE_URL`.

**`npm run db:start` fails immediately**

Docker Desktop is not running, or `docker` is not on your PATH. Start Docker and run the command again.

**Connection refused on port 5434**

The container is not up. Run `docker compose ps`. If `db` is not healthy, run `npm run db:start` again. If another program already uses 5434, change the host port in `docker-compose.yml` (the `5434:5432` mapping) and use the same port in `.env`.

**Sign-in says the account is invalid**

The database was never seeded, or it was recreated empty. Run `npm run db:setup`.

**The page loads but every query fails**

The dev server started before Postgres was ready, or `.env` points at a different database than the one you seeded. Stop the server, confirm `npm run db:start` succeeded, then run `npm run dev` again.
