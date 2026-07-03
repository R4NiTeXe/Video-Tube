# Requirements Document

## Introduction

The VideoTube frontend requires a structural layout redesign that replaces its monolithic, per-page navigation and sidebar markup with a proper Next.js 16 App Router layout hierarchy. The redesign introduces route groups to separate authenticated and unauthenticated pages, extracts reusable layout and UI components, and establishes shared TypeScript types — while preserving every existing API call, auth flow, theme management behavior, and animation exactly as-is. The result is a clean structural skeleton with well-defined component boundaries and data flow.

## Glossary

- **App_Shell**: The persistent layout wrapper rendered by `app/(app)/layout.tsx` that provides `Navbar`, `Sidebar`, and a main content area for all authenticated pages.
- **Navbar**: The top navigation bar component extracted from the current inline nav, shared across all authenticated pages.
- **Sidebar**: The left navigation panel component extracted from the current inline floating sidebar, shared across all authenticated pages.
- **Auth_Group**: The Next.js route group `(auth)` containing `login` and `register` pages, rendered without `App_Shell`.
- **App_Group**: The Next.js route group `(app)` containing all authenticated pages, rendered inside `App_Shell`.
- **VideoCard**: A reusable UI component that renders a single video's thumbnail, title, owner, duration, and view count.
- **LoadingSkeleton**: A reusable UI component that renders pulsing placeholder shapes matching the real content layout.
- **Auth_Guard**: The per-page pattern that reads `useAuthStore` and redirects unauthenticated users to `/login`.
- **AuthStore**: The Zustand store (`useAuthStore`) that holds `isAuthenticated`, `isLoading`, `user`, and `logout`.
- **ThemeStore**: The Zustand store (`useThemeStore`) that holds `theme` and `toggleTheme`.
- **Type_Module**: The shared TypeScript types file at `src/types/index.ts`.
- **FilterChips**: The non-functional category filter buttons on the home feed page.
- **UploadModal**: The video upload modal co-located in the Studio page.
- **StatCard**: The channel statistics card co-located in the Studio page.

---

## Requirements

### Requirement 1: Route Group Separation

**User Story:** As a developer, I want login and register pages isolated from authenticated pages via Next.js route groups, so that each group can have its own layout without affecting the browser URL.

#### Acceptance Criteria

1. THE App_Router SHALL render `app/(auth)/login/page.tsx` when the browser navigates to `/login`.
2. THE App_Router SHALL render `app/(auth)/register/page.tsx` when the browser navigates to `/register`.
3. THE App_Router SHALL render `app/(app)/page.tsx` when the browser navigates to `/`.
4. WHEN a user navigates to any route under `app/(auth)/*`, THE App_Router SHALL NOT render the App_Shell, Navbar, or Sidebar.
5. WHEN a user navigates to any route under `app/(app)/*`, THE App_Router SHALL render the App_Shell exactly once as the parent layout.
6. THE App_Router SHALL exclude the route group segment names `(auth)` and `(app)` from the browser URL path.

---

### Requirement 2: App Shell Component

**User Story:** As a developer, I want a persistent App Shell that wraps all authenticated pages, so that Navbar and Sidebar are rendered once and preserved across in-group navigations.

#### Acceptance Criteria

1. THE App_Shell SHALL render the Navbar at the top of the page on every authenticated route.
2. THE App_Shell SHALL render the Sidebar on the left side of the page on every authenticated route.
3. THE App_Shell SHALL render its `children` prop inside a `<main>` element between Navbar and the primary content area.
4. WHEN a user navigates between pages within `app/(app)/*`, THE App_Shell SHALL preserve the Navbar and Sidebar components without unmounting and remounting them.
5. THE App_Shell SHALL NOT perform authentication checking or redirects — that responsibility belongs to individual pages via the Auth_Guard pattern.
6. THE App_Shell SHALL accept a `children` prop of type `React.ReactNode` as its only interface.

---

### Requirement 3: Navbar Component

**User Story:** As a user, I want a consistent top navigation bar on all authenticated pages, so that I can access search, theme toggle, studio link, and logout without per-page duplication.

#### Acceptance Criteria

1. THE Navbar SHALL render the VideoTube logo or wordmark.
2. THE Navbar SHALL render a search input element.
3. THE Navbar SHALL render a theme toggle control that calls `ThemeStore.toggleTheme` when activated.
4. THE Navbar SHALL render the authenticated user's avatar sourced from `AuthStore.user.avatar`.
5. THE Navbar SHALL render a logout action that calls `api.post("/users/logout")` and then `AuthStore.logout()` when triggered.
6. THE Navbar SHALL render a link or button that navigates to `/studio`.
7. THE Navbar SHALL read its data from `AuthStore` and `ThemeStore` internally without requiring props for user or theme data.
8. IF the logout API call fails, THEN THE Navbar SHALL still call `AuthStore.logout()` to clear the local session.

---

### Requirement 4: Sidebar Component

**User Story:** As a user, I want a persistent left navigation panel on all authenticated pages, so that I can navigate to Home, Trending, and Library from any authenticated page.

#### Acceptance Criteria

1. THE Sidebar SHALL render navigation items for at minimum: Home (`/`), Trending, and Library.
2. WHEN the current pathname matches a navigation item's route, THE Sidebar SHALL apply an active visual style to that item.
3. WHEN a user clicks a navigation item, THE Sidebar SHALL call `router.push` with the corresponding route path.
4. THE Sidebar SHALL read the current pathname from `usePathname()` internally without requiring an active-route prop.
5. THE Sidebar SHALL be positioned as a persistent left column within the App_Shell layout.

---

### Requirement 5: VideoCard Component

**User Story:** As a user, I want video cards to render consistently across the home feed, so that each video displays its thumbnail, title, owner, duration, and view count in a reusable format.

#### Acceptance Criteria

1. THE VideoCard SHALL render the video thumbnail in a 16:9 aspect ratio.
2. THE VideoCard SHALL render a duration badge overlay on the thumbnail using a formatted `M:SS` string derived from `Video.duration` (seconds).
3. THE VideoCard SHALL render the owner's avatar overlapping the bottom edge of the thumbnail area, sourced from `Video.owner.avatar`.
4. THE VideoCard SHALL render the video title with a 2-line text clamp.
5. THE VideoCard SHALL render the owner's full name sourced from `Video.owner.fullName`.
6. THE VideoCard SHALL render the formatted view count using a human-readable string: values ≥ 1,000,000 display as `X.XM`; values ≥ 1,000 display as `X.XK`; values below 1,000 display as the integer string.
7. THE VideoCard SHALL wrap the entire card in a `<Link>` element with `href` set to `/videos/${Video._id}`.
8. WHEN an `index` prop is provided, THE VideoCard SHALL apply a Framer Motion entry animation with a stagger delay of `Math.min(index * 0.05, 0.5)` seconds.
9. THE VideoCard SHALL accept a `video` prop of type `Video` and an optional `index` prop of type `number`.

---

### Requirement 6: LoadingSkeleton Component

**User Story:** As a user, I want skeleton loading states instead of plain "Loading..." text on all pages, so that I see a meaningful placeholder while data is being fetched.

#### Acceptance Criteria

1. THE LoadingSkeleton SHALL accept a `variant` prop with values: `"video-grid"`, `"video-player"`, `"studio-stats"`, `"studio-table"`, or `"generic"`.
2. WHEN `variant` is `"video-grid"`, THE LoadingSkeleton SHALL render a grid of card-shaped pulsing skeleton elements.
3. WHEN `variant` is `"video-player"`, THE LoadingSkeleton SHALL render a player-area skeleton and an info-block skeleton.
4. WHEN `variant` is `"video-player"`, THE LoadingSkeleton SHALL render exactly one player-area skeleton and one info-block skeleton.
5. WHEN `variant` is `"studio-stats"`, THE LoadingSkeleton SHALL render exactly 4 stat-card-shaped pulsing skeleton elements.
6. WHEN `variant` is `"studio-table"`, THE LoadingSkeleton SHALL render table-row-shaped pulsing skeleton elements.
7. WHEN `variant` is `"generic"`, THE LoadingSkeleton SHALL render simple text-line-shaped pulsing skeleton elements.
8. WHEN `variant` is `"video-grid"` and a `count` prop is provided, THE LoadingSkeleton SHALL render exactly `count` card skeletons.
9. WHEN `variant` is `"video-grid"` and no `count` prop is provided, THE LoadingSkeleton SHALL render exactly 8 card skeletons by default.

---

### Requirement 7: Shared TypeScript Types

**User Story:** As a developer, I want all shared data types defined in a single module, so that page files and components import from one canonical source with no inline type duplication.

#### Acceptance Criteria

1. THE Type_Module SHALL export the `Video` interface with required fields: `_id`, `title`, `thumbnail`, `videoFile`, `duration`, `views`, `isPublished`, `createdAt`, `updatedAt`.
2. THE Type_Module SHALL export the `VideoOwner` interface with required fields: `_id`, `fullName`, `username`, `avatar`.
3. THE Type_Module SHALL export the `Comment` interface with required fields: `_id`, `content`, `createdAt`.
4. THE Type_Module SHALL export the `User` interface with required fields: `_id`, `fullName`, `username`, `email`, `avatar`.
5. THE Type_Module SHALL export the `ChannelStats` interface with fields: `totalViews`, `totalSubscribers`, `totalLikes`, `totalVideos`.
6. THE Type_Module SHALL export the `StudioVideo` interface with fields: `_id`, `title`, `thumbnail`, `isPublished`, `views`, `likesCount`, `createdAt`.
7. THE Type_Module SHALL export the `PaginatedResponse<T>` generic interface with fields: `docs`, `totalDocs`, `page`, `limit`, `totalPages`, `hasNextPage`, `hasPrevPage`.
8. THE App_Group page files SHALL NOT declare inline `interface` or `type` definitions for `Video`, `Comment`, `User`, or `ChannelStats` — these SHALL be imported from the Type_Module.

---

### Requirement 8: Auth Guard Pattern

**User Story:** As a developer, I want a consistent per-page authentication guard pattern, so that unauthenticated users are always redirected to `/login` from any authenticated page.

#### Acceptance Criteria

1. WHEN `AuthStore.isLoading` is `true`, THE Auth_Guard SHALL render a loading spinner and SHALL NOT redirect.
2. WHEN `AuthStore.isLoading` is `false` AND `AuthStore.isAuthenticated` is `false`, THE Auth_Guard SHALL call `router.push("/login")`.
3. WHEN `AuthStore.isLoading` is `false` AND `AuthStore.isAuthenticated` is `true`, THE Auth_Guard SHALL render the page content.
4. THE Auth_Guard pattern SHALL be applied in every page under `app/(app)/*` that calls authenticated API endpoints.
5. THE App_Shell layout (`app/(app)/layout.tsx`) SHALL NOT perform authentication checking or redirects.

---

### Requirement 9: Preserved API Calls and Functional Behavior

**User Story:** As a developer, I want all existing API calls and business logic preserved identically after the refactor, so that no user-facing functionality is broken by the structural changes.

#### Acceptance Criteria

1. THE refactored pages SHALL call the same API endpoints with the same HTTP methods, query keys, and mutation configurations as the original pages.
2. THE home feed page SHALL fetch videos via the same `api.get` call used in the original `app/page.tsx`.
3. THE video player page SHALL fetch video details and comments via the same `api.get` calls used in the original player page.
4. THE studio page SHALL fetch channel stats and studio videos via the same `api.get` calls used in the original studio page.
5. THE studio page SHALL post video uploads via the same `api.post` call with the same multipart form configuration.
6. WHEN a video like action is triggered, THE video player page SHALL call the same `api.post` endpoint as the original implementation.
7. WHEN a comment is submitted, THE video player page SHALL call the same `api.post` endpoint as the original implementation.
8. THE FilterChips on the home page SHALL remain non-functional (no API filtering) with a `TODO` comment marking the future wiring point.

---

### Requirement 10: Video Player Page Structural Cleanup

**User Story:** As a user, I want the video player page to provide proper inline UI feedback instead of browser alert dialogs, so that error and success states feel native to the application.

#### Acceptance Criteria

1. THE video player page SHALL replace all `alert()` calls with inline UI feedback rendered within the page.
2. WHEN a comment submission fails, THE video player page SHALL render an inline error message below the comment form.
3. WHEN a comment submission fails, THE video player page SHALL preserve the user's input in the comment field.
4. WHEN `GET /videos/:videoId` returns a 404 or the video data is undefined, THE video player page SHALL render an inline "Video not found" message with a back-navigation control.
5. THE video player page SHALL replace emoji like buttons with SVG icon buttons.
6. THE video player page SHALL preserve all existing like and comment API call logic unchanged.

---

### Requirement 11: Error Handling for Data Fetching

**User Story:** As a user, I want meaningful error states instead of blank or broken pages when data fails to load, so that I always understand what went wrong and can take action.

#### Acceptance Criteria

1. WHEN the videos feed API call fails, THE home page SHALL render a message stating that videos failed to load and that the user may refresh.
2. WHEN the studio stats or videos API call fails, THE studio page SHALL render an inline error message.
3. WHEN a video upload fails, THE UploadModal SHALL render its existing error message and preserve the populated form fields.
4. WHEN the token refresh API call fails, THE Auth_Guard pattern SHALL call `AuthStore.logout()` and redirect to `/login`.

---

### Requirement 12: Token Refresh and Session Handling

**User Story:** As a user, I want my session to be refreshed transparently when my access token expires, so that I am not interrupted by sudden logouts during normal use.

#### Acceptance Criteria

1. WHEN an API call returns a `401` response, THE API interceptor in `api.ts` SHALL attempt a token refresh via `POST /users/refresh-token`.
2. WHEN the token refresh succeeds, THE API interceptor SHALL retry the original failed request transparently.
3. WHEN the token refresh fails, THE API interceptor SHALL call `AuthStore.logout()`.
4. THE API interceptor SHALL use `withCredentials: true` on all requests, relying on HTTP-only cookies for token storage.
5. THE application SHALL NOT store access tokens or refresh tokens in `localStorage` or `sessionStorage`.

---

### Requirement 13: Theme Management

**User Story:** As a user, I want to toggle the application theme from the Navbar, so that my theme preference is applied consistently and the global floating toggle button is removed.

#### Acceptance Criteria

1. THE Navbar SHALL render the theme toggle control using the existing `ThemeToggleButton` component or equivalent inline logic sourced from `ThemeStore`.
2. WHEN the theme toggle is activated, THE ThemeStore SHALL update the theme state.
3. THE root layout (`app/layout.tsx`) SHALL NOT render a standalone floating `ThemeToggleButton` that overlaps page content.
4. THE `ThemeToggleButton.tsx` component file SHALL be preserved as-is and remain available for use by the Navbar.

---

### Requirement 14: Component Co-location Policy

**User Story:** As a developer, I want page-specific components to remain co-located with their pages and only truly shared components to live in `src/components`, so that the project structure reflects actual reuse boundaries.

#### Acceptance Criteria

1. THE `UploadModal` component SHALL remain co-located within `app/(app)/studio/page.tsx` and SHALL NOT be moved to `src/components`.
2. THE `StatCard` component SHALL remain co-located within `app/(app)/studio/page.tsx` and SHALL NOT be moved to `src/components`.
3. THE `AppShell`, `Navbar`, and `Sidebar` components SHALL be located at `src/components/layout/`.
4. THE `VideoCard` and `LoadingSkeleton` components SHALL be located at `src/components/ui/`.
5. THE existing `MascotAnimation`, `SplashScreen`, `SplashWrapper`, and `ThemeToggleButton` components SHALL remain at their current paths without modification.
