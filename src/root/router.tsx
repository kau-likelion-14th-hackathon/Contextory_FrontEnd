import { createBrowserRouter, Navigate } from "react-router-dom";
import { AccountSettingsScreen } from "../features/account/AccountSettingsScreen";
import { UiShowcase } from "../features/dev/UiShowcase";
import { ProjectHomeScreen } from "../features/project/ProjectHomeScreen";
import { GitHubWorkScreen } from "../features/github/GitHubWorkScreen";
import {
  AuthBoundary,
  ProjectBoundary,
} from "../features/workspace/RouteBoundaries";
import { WorkspaceShell } from "../features/workspace/WorkspaceShell";
import {
  AnalysisReviewPlaceholder,
  GitHubPullRequestPlaceholder,
  InvitationScreen,
  NotFoundScreen,
  ProjectCreateScreen,
  ProjectMemoryScreen,
  ProjectRecordDetailScreen,
  ProjectSelectScreen,
  ResetPasswordScreen,
  SimpleAuthScreen,
  TeamSettingsScreen,
} from "../features/workspace/WorkspaceScreens";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: "/auth/login",
    element: <SimpleAuthScreen mode="login" />,
  },
  {
    path: "/auth/signup",
    element: <SimpleAuthScreen mode="signup" />,
  },
  {
    path: "/auth/forgot-password",
    element: <SimpleAuthScreen mode="forgot-password" />,
  },
  {
    path: "/auth/reset-password",
    element: <ResetPasswordScreen />,
  },
  {
    path: "/invitations/:token",
    element: <InvitationScreen />,
  },
  {
    path: "/dev/ui",
    element: <UiShowcase />,
  },
  {
    element: <AuthBoundary />,
    children: [
      {
        path: "/projects",
        element: <ProjectSelectScreen />,
      },
      {
        path: "/projects/new",
        element: <ProjectCreateScreen />,
      },
      {
        path: "/account",
        element: <AccountSettingsScreen />,
      },
      {
        path: "/projects/:projectId",
        element: <ProjectBoundary />,
        children: [
          {
            element: <WorkspaceShell />,
            children: [
              {
                index: true,
                element: <Navigate to="home" replace />,
              },
              {
                path: "home",
                element: <ProjectHomeScreen />,
              },
              {
                path: "github",
                element: <GitHubWorkScreen />,
              },
              {
                path: "github/pulls/:pullRequestId",
                element: <GitHubPullRequestPlaceholder />,
              },
              {
                path: "analyses/:analysisId",
                element: <AnalysisReviewPlaceholder />,
              },
              {
                path: "records",
                element: <ProjectMemoryScreen />,
              },
              {
                path: "records/:recordId",
                element: <ProjectRecordDetailScreen />,
              },
              {
                path: "settings",
                element: <TeamSettingsScreen />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundScreen />,
  },
]);
