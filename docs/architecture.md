# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Keep the three tiers separate: React pages render API data, Express routes delegate behavior
to service functions, and Mongoose models persist and validate records. Do not add
authentication in this exercise.

- **Presentation tier decision:** Build a client-rendered React 19 single-page application.
  React Router maps the activities, teams, leaderboard, and workout suggestions pages;
  each page fetches its data through the shared `src/api/client.ts` client using relative
  `/api` paths. Use Bootstrap for layout and give every page accessible loading, empty,
  success, and error states.
- **Logic tier:** Keep `/api/*` handlers thin; put request validation and business rules
  in explicit service functions. Return deliberate 4xx responses for invalid input,
  malformed IDs, missing referenced records, and unknown users rather than leaking
  Mongoose cast errors as 500 responses.
- **Data tier:** Use Mongoose models for users, teams, activities, and workouts. Enforce
  required fields and valid values in schemas, and use the shared MongoDB connection
  configuration (`mongodb://localhost:27017/octofit_db` by default). Seed stable demo
  records with upserts; do not clear application data, and remove a demo user's previous
  team membership when moving that fixture.
- **Activity tracking:** Accept a user ID, team ID, activity type, and positive minutes;
  validate the ID formats and that both records exist before saving. Store the user,
  team, type, minutes, server-computed points (one point per minute), and occurrence
  time. List saved activities through the API.
- **Team management:** Create teams with a non-empty name, mascot, and member list
  (empty by default); reject missing names with `400`. Validate member references and
  preserve the submitted team name and mascot in create and list responses.
- **Leaderboard:** Aggregate persisted activity points by team, order teams from
  highest to lowest total, and return `teamName`, `totalPoints`, and sequential,
  1-based ranks.
- **Workout suggestions:** Find the user by email and match workouts to their fitness
  goal or recent activity pattern, returning a reason with each recommendation. Return
  a deliberate 4xx response if no user matches the requested email.

## Test plan

Run these focused checks after implementing the capabilities. A failing contract test
means the behavior named below is missing or does not match the API/data/UI contract;
build failures indicate compile-time or production-bundle issues rather than a runtime
contract failure.

| Command | What it verifies | What a failure means |
| --- | --- | --- |
| `npm run test:data --prefix octofit-tracker/backend` | Required model fields and relationships, plus safe, repeatable demo seeding. | Schema validation or seed behavior is incorrect, or the data tier is not preserving unrelated data and reconciling seeded membership. |
| `npm run test:api --prefix octofit-tracker/backend` | Activity and team creation/listing, invalid-input handling, point totals and leaderboard ranks, and personalized workout suggestions including unknown users. | A route/service response, validation rule, persistence behavior, aggregation, or recommendation does not satisfy the API contract. |
| `npm test --prefix octofit-tracker/frontend` | Page rendering for API data, route requests, and accessible loading, empty, and error states. | A page or shared API client is not rendering or reporting the expected state accessibly, or is requesting the wrong endpoint. |
| `npm run build --prefix octofit-tracker/backend` | Backend TypeScript type-check. | Backend types or module references are invalid; correct them before running the API. |
| `npm run build --prefix octofit-tracker/frontend` | Frontend TypeScript type-check and Vite production build. | Frontend types/imports or production bundling are invalid; the application is not ready to build for deployment. |
