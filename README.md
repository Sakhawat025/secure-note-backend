# Secure Note-Taking Platform - Backend API

A RESTful API built from scratch using Node.js, Express.js, MongoDB (Mongoose), and JWT authentication with Role-Based Access Control (RBAC), database indexing, pagination, and aggregation pipelines.

## Live Deployment & Repository Links
- **Live Backend API URL:** [https://secure-note-backend-amae.onrender.com](https://secure-note-backend-amae.onrender.com)
- **Live Frontend Website URL:** [https://secure-note-frontend-sigma.vercel.app](https://secure-note-frontend-sigma.vercel.app)
- **Frontend GitHub Repository:** [https://github.com/Sakhawat025/secure-note-frontend](https://github.com/Sakhawat025/secure-note-frontend)

---

## 1. Tech Stack & Security Implementation
- **Runtime & Framework:** Node.js, Express.js
- **Database:** MongoDB Atlas with Mongoose ODM
- **Authentication:** JSON Web Tokens (JWT) containing user `id` and `role` in the payload to avoid redundant database lookups on protected routes.
- **Security:** Password hashing using `bcryptjs` (`pre-save` hook) with salt rounds and CORS enabled for cross-origin frontend integration.

---

## 2. Database Indexing Strategy (`schema.index`)

Per the critical task constraint (*"DO NOT MAKE ANY UNNECESSARY INDEXES"*), every index in this project is strictly mapped to a required query or aggregation pipeline and defined explicitly via `schema.index()` for code review visibility:

### A. Default MongoDB `_id` Index (Built-in)
- **Supported Operations:** `GET /api/auth/me`, `GET /api/users/:id`, `GET /api/notes/:id`, `PUT` & `DELETE` operations by ID, and the `$match` stage in Scenario 2 (`GET /api/posts/user/:userId`).
- **Justification:** MongoDB automatically maintains a unique B-tree index on `_id`. Creating an additional custom index on `_id` is redundant and strictly avoided.

### B. User Collection (`models/User.js`)
1. `userSchema.index({ email: 1 }, { unique: true })`
   - **Purpose:** Supports fast $O(\log N)$ lookup during user login (`POST /api/auth/login`), duplicate checks during registration, and enforces unique email addresses at the database level.
2. `userSchema.index({ createdAt: -1 })`
   - **Purpose:** Supports the Admin paginated list of all users (`GET /api/users?page=1&limit=5`) sorted by newest first without triggering an in-memory `SORT` stage.
3. `userSchema.index({ interests: 1 })`
   - **Purpose:** Multikey index supporting **Scenario 1 Aggregation** (`GET /api/users/grouped-by-interests`). Allows the initial `$match: { interests: { $exists: true, $ne: [] } }` stage to utilize index bounds before `$unwind`.

### C. Note Collection (`models/Note.js`)
1. `noteSchema.index({ user: 1, createdAt: -1 })`
   - **Purpose:** Compound index following the **ESR (Equality, Sort, Range)** rule. Supports a logged-in user fetching their own paginated notes (`GET /api/notes?page=1&limit=5`), where `user` is the Equality filter and `createdAt: -1` satisfies the Sort order directly from the index.
2. `noteSchema.index({ createdAt: -1 })`
   - **Purpose:** Supports the Admin view of everyone's notes with pagination (`GET /api/notes/all?page=1&limit=5`) sorted by newest first.

### D. Post Collection (`models/Post.js`)
1. `postSchema.index({ author: 1 })`
   - **Purpose:** Optimizes **Scenario 2 Aggregation** (`$lookup` stage in `GET /api/posts/user/:userId`). When joining `users._id` (`localField`) with `posts.author` (`foreignField`), MongoDB uses this index on `author` to fetch matching posts without performing a full collection scan (`COLLSCAN`) on the `posts` collection.

---

## 3. Aggregation Pipelines

### Scenario 1: Group Users by Interests
- **Endpoint:** `GET /api/users/grouped-by-interests` (Admin Only)
- **Constraint Met:** Executed using a single `User.aggregate()` call.
- **Pipeline Stages:**
  1. `$match`: Filters users with non-empty `interests` arrays (utilizes `{ interests: 1 }` multikey index).
  2. `$unwind`: Deconstructs the `interests` array field to output a document for each element.
  3. `$group`: Groups users by interest name (`_id: '$interests'`), calculates total user `count`, and pushes user details (`_id`, `name`, `email`) into a `users` array.
  4. `$sort`: Sorts interest groups alphabetically (`{ _id: 1 }`).

### Scenario 2: Retrieve User Posts using `$lookup`
- **Endpoint:** `GET /api/posts/user/:userId` (Public)
- **Constraint Met:** Executed using a single `User.aggregate()` pipeline with a `$lookup` stage.
- **Pipeline Stages:**
  1. `$match`: Matches the target user by `_id` (utilizes default `_id` index).
  2. `$lookup`: Joins the `posts` collection where `localField: '_id'` matches `foreignField: 'author'` (utilizes `{ author: 1 }` index on `Post`), outputting matching documents into the `userPosts` array.
  3. `$project`: Excludes the hashed `password` field from the response.

---

## 4. API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new user or admin
- `POST /api/auth/login` - Authenticate user and receive JWT
- `GET /api/auth/me` - Get current logged-in user's profile

### Notes (`/api/notes`)
- `GET /api/notes?page=1&limit=5` - List logged-in user's own notes (Paginated)
- `GET /api/notes/all?page=1&limit=5` - Admin: List everyone's notes (Paginated)
- `GET /api/notes/:id` - Get a specific note by ID (Owner or Admin)
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update own note
- `DELETE /api/notes/:id` - Delete own note

### Users & Scenario 1 Aggregation (`/api/users` - Admin Only)
- `GET /api/users/grouped-by-interests` - **Scenario 1:** Users grouped by interests
- `GET /api/users?page=1&limit=5` - List all users (Paginated)
- `GET /api/users/:id` - Get single user profile by ID
- `POST /api/users` - Add a new user
- `PUT /api/users/:id` - Update user details, role, or interests
- `DELETE /api/users/:id` - Delete a user and their associated notes

### Posts & Scenario 2 Aggregation (`/api/posts`)
- `POST /api/posts` - Create a public post (Authenticated)
- `GET /api/posts/user/:userId` - **Scenario 2:** Retrieve user and all their posts via `$lookup` (Public)

---

## 5. Local Development Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone [https://github.com/Sakhawat025/secure-note-backend.git](https://github.com/Sakhawat025/secure-note-backend.git)
   cd secure-note-backend
   npm install