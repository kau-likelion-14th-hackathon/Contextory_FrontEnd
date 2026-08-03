# Contextory Routing Plan

## Current Router

Contextory now uses React Router through `createBrowserRouter` in
`src/root/router.tsx`. The app is a desktop-first web service and no longer
keeps Expo, React Native, or mobile deep-link compatibility.

Browser refresh restoration is handled by browser history URLs. Production
hosting must return `index.html` for application routes so React Router can
restore the current URL.

## Implemented Route Structure

```txt
/auth/login
/auth/signup
/auth/forgot-password
/auth/reset-password
/projects
/projects/new
/invitations/:token
/projects/:projectId/home
/projects/:projectId/github
/projects/:projectId/github/pulls/:pullRequestId
/projects/:projectId/analyses/:analysisId
/projects/:projectId/records
/projects/:projectId/records/:recordId
/projects/:projectId/settings
/account
*
```

## Temporary Boundaries

- `AuthBoundary` separates authenticated application routes from public routes.
- `ProjectBoundary` separates project-scoped routes.
- Neither boundary currently implements real login, session restoration, project
  access, or role policies.

Those policies must come from the latest backend API and ERD. Missing endpoints,
DTO fields, and authorization rules must not be inferred in the frontend.

## Hosting Requirement

For direct entry and refresh to work, the web host must serve `index.html` for
unknown non-asset paths such as `/projects/:projectId/home`.
