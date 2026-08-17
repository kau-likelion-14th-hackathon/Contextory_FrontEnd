import { createBrowserRouter, Navigate } from "react-router-dom";
import { AccountSettingsScreen } from "../features/account/AccountSettingsScreen";
import { PullRequestReviewScreen } from "../features/analysis/PullRequestReviewScreen";
import { UiShowcase } from "../features/dev/UiShowcase";
import { AuthScreen} from "../features/auth/AuthScreen";
import { PasswordRecoveryScreen } from "../features/auth/PasswordRecoveryScreen";
import { EmailVerificationScreen } from "../features/auth/EmailVerificationScreen";
import { ProjectJoinScreen } from "../features/auth/ProjectJoinScreen";
import { KakaoCallbackScreen } from "../features/auth/KakaoCallbackScreen";
import { ProjectHomeScreen } from "../features/project/ProjectHomeScreen";
import { GitHubWorkScreen } from "../features/github/GitHubWorkScreen";
import { ProjectCreateScreen } from "../features/project/ProjectCreateScreen";
import { ProjectSelectScreen } from "../features/project/ProjectSelectScreen";
import { ProjectMemoryDetailScreen } from "../features/memory/ProjectMemoryDetailScreen";
import { ProjectMemoryScreen } from "../features/memory/ProjectMemoryScreen";
import { TeamProjectSettingsScreen } from "../features/settings/TeamProjectSettingsScreen";
import {
  AuthBoundary,
  ProjectBoundary,
} from "../features/workspace/RouteBoundaries";
import { WorkspaceShell } from "../features/workspace/WorkspaceShell";
import { NotFoundScreen } from "../features/workspace/WorkspaceScreens";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: "/auth/login",
    element: <AuthScreen mode="login" />, // 로그인 화면
  },
  {
    path: "/auth/signup",
    element: <AuthScreen mode="signup" />,  // 회원가입 화면
  },
  {
    path: "/auth/forgot-password",
    element: <PasswordRecoveryScreen  mode="request" />, // 비밀번호 재설정 요구 화면 
  },
  {
    path: "/auth/reset-password",
    element: <PasswordRecoveryScreen mode="reset" />, // 비밀번호 재설정 화면
  },
  {
    path: "/auth/verify-email",
    element: <EmailVerificationScreen /> // 이메일 인증화면
  },
  {
    path: "/login/oauth2/code/kakao",
    element: <KakaoCallbackScreen />,
  },
  {
    path: "/invitations/:token",
    element: <ProjectJoinScreen />, // 프로젝트 초대 화면
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
        element: <ProjectSelectScreen />, // 빈 프로젝트 화면, 내 프로젝트 화면
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
                element: <PullRequestReviewScreen />,
              },
              {
                path: "analyses/:analysisId",
                element: <PullRequestReviewScreen />,
              },
              {
                path: "records",
                element: <ProjectMemoryScreen />,
              },
              {
                path: "records/:recordId",
                element: <ProjectMemoryDetailScreen />,
              },
              {
                path: "settings",
                element: <TeamProjectSettingsScreen />,
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
