import { Link } from "react-router-dom";
import { AuthLayout, PageContainer, SettingsLayout } from "../../shared/layouts";
import {
  EmptyState,
} from "../../shared/components/AppState";
import { projectSummary } from "../projects/projectSummary";

type AuthMode = "login" | "signup" | "forgot-password";

export function SimpleAuthScreen({ mode }: { mode: AuthMode }) {
  const copy = {
    login: {
      title: "Login",
      body: "이메일 로그인 API 명세가 확정되면 실제 입력, 검증, 세션 복원 흐름을 연결합니다.",
      action: "Continue to projects",
    },
    signup: {
      title: "Sign up",
      body: "회원가입 필드와 약관 정책은 최신 인증 명세를 기준으로 연결합니다.",
      action: "Create placeholder account",
    },
    "forgot-password": {
      title: "Forgot password",
      body: "비밀번호 재설정 요청 API가 확정되면 이메일 발송 흐름을 연결합니다.",
      action: "Back to login",
    },
  }[mode];

  return (
    <AuthLayout
      title={
        <span style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <span style={{ color: "#132019" }}>프로젝트의 맥락을 이해하고,</span>
          <span style={{ color: "#0D7A55" }}>더 나은 협업을 만들어가세요</span>
        </span>
      }
      description="{
        <span>
          GitHub 변경을 수집하고 AI가 분석한 맥락을<br/>
          검토·승인하여 팀의 프로젝트 메모리로 남깁니다.
        </span>
      }"
    >
      <div className="auth-card" aria-label={copy.title}>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <Link
          className="ui-button ui-button--primary ui-button--md"
          to={mode === "forgot-password" ? "/auth/login" : "/projects"}
        >
          {copy.action}
        </Link>
        <div className="inline-link-group">
          <Link to="/auth/login">Login</Link>
          <Link to="/auth/signup">Sign up</Link>
          <Link to="/auth/forgot-password">Forgot password</Link>
        </div>
      </div>
    </AuthLayout>
  );
}

/*
export function ResetPasswordScreen() {
  return (
    <AuthLayout title="Reset password" description="비밀번호 재설정 링크를 통해 계정을 복구합니다.">
      <div className="auth-card">
        <h1>Reset password</h1>
        <p>
          재설정 token 전달 방식과 만료 정책은 인증 API 명세가 확정되면
          연결합니다.
        </p>
        <Link className="ui-button ui-button--primary ui-button--md" to="/auth/login">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
} */

// export function InvitationScreen() {
//   const { token } = useParams();

//   return (
//     <main>
//       <PageContainer>
//       <section className="content-section">
//         <p className="eyebrow">Invitation</p>
//         <h1>Project invitation</h1>
//         <p className="text-muted">
//           초대 토큰 `{token}`은 로그인 또는 회원가입 이후 복구되어야 합니다.
//           실제 검증은 초대 API 명세가 확정되면 연결합니다.
//         </p>
//         <Link className="ui-button ui-button--primary ui-button--md" to="/auth/login">
//           Continue with account
//         </Link>
//       </section>
//       </PageContainer>
//     </main>
//   );
// }

export function ProjectCreateScreen() {
  return (
    <main>
      <PageContainer>
      <section className="content-section">
        <h1>New project</h1>
        <EmptyState
          title="Project creation is not connected"
          description="프로젝트 이름, 목적, 주요 기능, 팀 역할 입력은 백엔드 명세 확정 후 연결합니다."
        />
      </section>
      </PageContainer>
    </main> 
  );
}

export function TeamSettingsScreen() {
  return (
    <main>
      <PageContainer>
      <SettingsLayout
        title="Team & Settings"
        description="프로젝트 설정과 팀 관리를 분리해서 표시합니다."
        navItems={[
          { label: "Project", active: true },
          { label: "Members" },
          { label: "Billing" },
        ]}
      >
        <dl className="definition-list-panel">
          <div>
            <dt>Project role</dt>
            <dd>{projectSummary.role}</dd>
          </div>
          <div>
            <dt>Repository</dt>
            <dd>Not connected</dd>
          </div>
          <div>
            <dt>Approval policy</dt>
            <dd>Requires manager approval</dd>
          </div>
        </dl>
      </SettingsLayout>
      </PageContainer>
    </main>
  );
}

export function NotFoundScreen() {
  return (
    <main>
      <PageContainer>
      <section className="content-section">
        <h1>Page not found</h1>
        <p className="text-muted">요청한 Contextory 경로를 찾을 수 없습니다.</p>
        <Link className="ui-button ui-button--primary ui-button--md" to="/projects">
          Go to projects
        </Link>
      </section>
      </PageContainer>
    </main>
  );
}
