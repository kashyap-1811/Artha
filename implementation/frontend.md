# 🚀 React Frontend Interview Preparation Report: Artha Project

This report provides a comprehensive analysis of the `artha-frontend` codebase. Use these notes to revise and prepare for your React/Frontend developer interviews based on your project.

---

## 1. Project Architecture

### Folder Structure
The project follows a standard feature/type-based architecture common in modern React applications (Vite + React + TailwindCSS):
* **`src/api/`**: Contains dedicated service files (`auth.js`, `users.js`, `budgets.js`, etc.) for managing API requests.
* **`src/components/`**: Houses reusable UI elements. Includes layout wrappers (`Layout.jsx`, `Navbar.jsx`) and specific UI components (`ui/Button.jsx`, `ConfirmModal.jsx`).
* **`src/pages/`**: Contains the route-level components ("Smart" components) such as `DashboardPage.jsx`, `CompanyPage.jsx`, and `HomePage.jsx`.
* **`src/lib/`**: Contains utility functions like `errorParser.js` and `utils.js`.
* **`src/index.css` & `src/styles.css`**: Global stylesheets and Tailwind configuration.

### Component Hierarchy
The root of the application is `App.jsx`, which uses `react-router-dom` for routing.
* **Public Routes**: Render independently (e.g., `<HomePage />`, `<AuthPage />`).
* **Protected Routes**: Wrapped inside a `<Layout>` higher-order component that provides the Navbar, Sidebar, and consistent page structure for authenticated users (e.g., `<Layout><DashboardPage /></Layout>`).

### Data Flow
The application primarily uses **Unidirectional Data Flow**.
* State is declared in the Page components (e.g., `DashboardPage.jsx`) using `useState`.
* Data fetched from APIs is stored in these local states and passed down as **Props** to child components like `<StatCard />` or custom charts.

---

## 2. React Concepts Used

* **Functional Components**: The entire project uses modern functional components rather than class components.
* **Props**: Extensively used to pass data from Page components to Presentational (Dumb) components.
* **State Management (`useState`)**: Used in almost all page components to handle local data (e.g., fetched lists, loading booleans, error strings).
* **Side Effects (`useEffect`)**: Used heavily in Pages to trigger API calls when the component mounts or when specific dependencies (like `companyId` from the URL) change.
* **`useMemo`**: Used in pages like `ProfilePage.jsx` (calculating membership days), `BudgetPage.jsx` (grouping allocations), and `AnalysisPage.jsx` to cache expensive calculations and prevent recalculating on every re-render.
* **`useCallback`**: Utilized in `DashboardPage.jsx` and `CompanyPage.jsx` to memoize fetch functions (`fetchData`) or event handlers so they don't get recreated on every render.
* **`useRef`**: Used to access DOM elements directly (e.g., in `ScrollStack.jsx` for scroll animations) or to hold mutable variables that shouldn't trigger re-renders.
* **React Router**: `react-router-dom` handles client-side routing using `<Routes>`, `<Route>`, and `<Navigate>`.
* **Context API & useReducer**: **Not used** in the current architecture.

---

## 3. State Management Analysis

### Current Approach
State is entirely localized. Global state (like the Authentication Token) is managed directly via `localStorage.getItem("artha_jwt")` in the API layer. 

### Where Context API or useReducer *Should* Be Used
* **Context API**: Should be implemented for an `AuthContext` to manage the logged-in user's state globally. Currently, components don't instantly know when a user logs out unless a hard refresh occurs or prop drilling is used.
* **useReducer**: Could be used in complex pages like `BudgetPage` or `AnalysisPage` where multiple states (loading, error, data, filters) are updated together. A reducer would make state transitions predictable.

### Alternative Approaches
* **React Query / SWR**: Given the heavy reliance on `useEffect` for data fetching, migrating to React Query would automatically handle loading/error states, caching, and background refetching.

---

## 4. Performance Optimization

### Existing Optimizations
* Excellent use of **`useMemo`** to avoid re-calculating derived data (like budget summaries or chart data).
* Use of **`useCallback`** to stabilize function references passed as dependencies to `useEffect`.

### Missing Optimizations & Opportunities
* **Code-Splitting**: The app currently bundles all pages together. Using `React.lazy()` and `<Suspense>` for routing (e.g., `const DashboardPage = lazy(() => import('./pages/DashboardPage'))`) would drastically reduce the initial load time.
* **Re-render Issues**: Passing inline functions or objects to child components might trigger unnecessary re-renders. Implementing `React.memo` on heavy child components (like Charts) would prevent this.

---

## 5. Component Analysis

* **Smart Components (Pages)**: Components like `DashboardPage` and `CompanyPage` act as containers. They fetch data, handle logic, and manage state.
* **Dumb Components (UI/Presentational)**: Components like `ui/Button.jsx` and `StatCard.jsx` are purely presentational. They receive props and render UI.
* **Potential Refactoring**: Complex pages are getting very large. The data-fetching logic inside `useEffect` could be extracted into **Custom Hooks** (e.g., `useCompanyData(companyId)`) to keep the UI components clean and focused strictly on rendering.

---

## 6. API Layer Analysis

* **How API calls are handled**: Handled using the native `fetch` API inside dedicated module files (`api/auth.js`, `api/users.js`).
* **Auth Headers**: Handled manually via a `getAuthHeaders()` utility function that reads from `localStorage`.
* **Error Handling**: A centralized `parseErrorMessage` function processes Spring Boot API errors and returns friendly strings to the UI.
* **Best Practices Followed**: Separating API calls into service files rather than keeping them inside React components.
* **Best Practices Missed**: 
    1. Using `fetch` requires manual JSON parsing and error throwing on `!response.ok`. Using **Axios** would simplify this.
    2. Lack of an **Interceptor**. If the JWT token expires, the app doesn't automatically log the user out. An Axios interceptor could catch `401 Unauthorized` errors globally and redirect to `/auth`.

---

## 7. Interview Preparation: Q&A

### Q1: Can you explain how you managed state in your React application?
**Ideal Answer**: "In this project, I used functional components with React Hooks. I used `useState` for local component state, such as form inputs and toggle switches. For handling server state, I used `useEffect` to fetch data and stored the response in local state. While I didn't use Redux or Context API to keep the architecture simple, I stored authentication tokens in `localStorage`. If I were to scale this, I would implement React Query for server state caching and Context API for global user state."

### Q2: How did you optimize performance in your frontend?
**Ideal Answer**: "I heavily utilized `useMemo` and `useCallback`. For instance, on the Budget and Analysis pages, there is a lot of data aggregation (like summing up expenses or grouping allocations). I wrapped these calculations in `useMemo` so they only recalculate when the raw data changes, preventing expensive operations during regular UI re-renders. I also used `useCallback` to memoize fetch functions that were dependencies in my `useEffect` hooks to prevent infinite fetch loops."

### Q3: Why did you choose the native `fetch` API over Axios, and what are the trade-offs?
**Ideal Answer**: "I used `fetch` to minimize external dependencies and utilize the native browser API. I built a centralized `errorParser` utility to handle non-200 responses since `fetch` doesn't reject on HTTP errors automatically. However, the trade-off is more boilerplate code. If I were refactoring for production, I would introduce Axios to utilize Interceptors, which would allow me to globally handle 401 Unauthorized errors and refresh tokens automatically."

### Q4: Explain the difference between `useMemo` and `useCallback` and how you used them.
**Ideal Answer**: "Both are used for memoization to optimize performance. `useMemo` is used to memoize a *value* (the result of a function), while `useCallback` is used to memoize the *function definition* itself. In my project, I used `useMemo` to cache derived data arrays for charts so they aren't recalculated on every render. I used `useCallback` for event handlers and data-fetching functions passed as dependencies to `useEffect`."

---

## 8. Senior-Level Improvements & Recommendations

If you are asked how you would take this project to the next level (Production Readiness):

1. **Implement React Query (TanStack Query)**: Replace all `useEffect` + `useState` data fetching with React Query. It provides caching, background fetching, pagination, and eliminates boilerplate loading/error states.
2. **Implement Global Auth State**: Use Context API to wrap the application in an `<AuthProvider>`. This ensures UI components instantly react to login/logout events without requiring prop drilling or page reloads.
3. **Route-Level Code Splitting**: Wrap routes in `React.lazy()` and `<Suspense>` to reduce the initial JavaScript bundle size. The user shouldn't download code for the `AnalysisPage` if they are only visiting the `HomePage`.
4. **Axios Interceptors**: Implement global error handling for `401/403` status codes to clear `localStorage` and smoothly redirect users to the login page when their session expires.
5. **TypeScript Integration**: Migrating from JavaScript (`.jsx`) to TypeScript (`.tsx`) would provide static typing, preventing runtime bugs regarding missing props or incorrect API response shapes.
