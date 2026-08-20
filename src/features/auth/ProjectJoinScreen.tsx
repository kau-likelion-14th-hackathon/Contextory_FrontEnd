import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { getAccessToken } from "../../shared/api/session";
import { AuthLayout } from "../../shared/layouts";
import { Button } from "../../shared/ui";
import { logout } from "./authApi";
import { resolveInvitationToken } from "./invitationRedirect";
import {
  acceptProjectInvitation,
  getProjectTeamApiErrorCode,
} from "../team/projectTeamApi";
import "./Auth.css";

type JoinErrorView = "invalid" | "already-processed" | "expired" | "email-mismatch" | "already-member" | "generic";

function getJoinErrorView(code: string | undefined): JoinErrorView {
  if (code === "PROJECT_INVITATION_4041") return "invalid";
  if (code === "PROJECT_INVITATION_4001") return "already-processed";
  if (code === "PROJECT_INVITATION_4002") return "expired";
  if (code === "PROJECT_INVITATION_4031") return "email-mismatch";
  if (code === "PROJECT_MEMBER_4091") return "already-member";
  return "generic";
}

function getJoinErrorMessage(code: string | undefined, fallback: string) {
  if (code === "PROJECT_INVITATION_4041") return "유효하지 않은 초대 링크입니다.";
  if (code === "PROJECT_INVITATION_4001") return "이미 처리되었거나 취소된 초대입니다.";
  if (code === "PROJECT_INVITATION_4002") return "초대 링크가 만료되었습니다.";
  if (code === "PROJECT_INVITATION_4031") return "현재 로그인한 계정의 이메일로는 이 초대를 수락할 수 없습니다.";
  if (code === "PROJECT_MEMBER_4091") return "이미 이 프로젝트에 참여 중입니다.";
  return fallback;
}

export function ProjectJoinScreen() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(getAccessToken());
  const [accepting, setAccepting] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [errorView, setErrorView] = useState<JoinErrorView | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const resolvedInvitationToken = resolveInvitationToken({
    pathToken,
    queryToken: searchParams.get("token"),
  });
  const invitationReturnPath = resolvedInvitationToken
    ? `${location.pathname}${location.search}`
    : undefined;
  const authRedirect = invitationReturnPath
    ? `?redirect=${encodeURIComponent(invitationReturnPath)}`
    : "";

  async function handleAccept() {
    if (!resolvedInvitationToken || accepting) return;

    setAccepting(true);
    setErrorView(null);
    setErrorMessage("");

    try {
      const response = await acceptProjectInvitation(resolvedInvitationToken);
      navigate(`/projects/${response.projectId}/home`, { replace: true });
    } catch (error: unknown) {
      const code = getProjectTeamApiErrorCode(error);
      setErrorView(getJoinErrorView(code));
      setErrorMessage(getJoinErrorMessage(code, getApiErrorMessage(error, "프로젝트 참여에 실패했습니다.")));
    } finally {
      setAccepting(false);
    }
  }

  async function handleSwitchAccount() {
    if (switchingAccount) return;
    setSwitchingAccount(true);

    try {
      await logout();
    } catch {
      // logout()은 실패해도 로컬 세션을 정리하므로 계정 전환을 계속한다.
    }

    navigate(`/auth/login${authRedirect}`, { replace: true });
  }

  if (!resolvedInvitationToken) {
    return (
      <AuthLayout
        description="초대 링크를 확인한 뒤 프로젝트에 참여할 수 있습니다."
        title="프로젝트 초대"
      >
        <div className="auth-card auth-card--centered">
          <div className="auth-card__header">
            <h1>유효하지 않은 초대 링크입니다</h1>
            <p>초대 링크가 올바르지 않습니다. 프로젝트 관리자에게 새 링크를 요청해주세요.</p>
          </div>
          <Button fullWidth onClick={() => navigate("/projects")} variant="primary">
            프로젝트 목록으로
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (errorView === "invalid") {
    return (
      <AuthLayout description="초대 링크를 확인한 뒤 프로젝트에 참여할 수 있습니다." title="프로젝트 초대">
        <JoinErrorCard
          description={errorMessage}
          onProjects={() => navigate("/projects")}
          title="유효하지 않은 초대 링크입니다"
        />
      </AuthLayout>
    );
  }

  if (errorView === "already-processed") {
    return (
      <AuthLayout description="초대 링크를 확인한 뒤 프로젝트에 참여할 수 있습니다." title="프로젝트 초대">
        <JoinErrorCard
          description={errorMessage}
          onProjects={() => navigate("/projects")}
          title="이미 처리된 초대입니다"
        />
      </AuthLayout>
    );
  }

  if (errorView === "expired") {
    return (
      <AuthLayout description="초대 링크를 확인한 뒤 프로젝트에 참여할 수 있습니다." title="프로젝트 초대">
        <JoinErrorCard
          description={errorMessage}
          onProjects={() => navigate("/projects")}
          title="초대 링크가 만료되었습니다"
        />
      </AuthLayout>
    );
  }

  if (errorView === "email-mismatch") {
    return (
      <AuthLayout description="초대 링크를 확인한 뒤 프로젝트에 참여할 수 있습니다." title="프로젝트 초대">
        <JoinErrorCard
          description={errorMessage}
          onProjects={() => navigate("/projects")}
          secondaryAction={{
            label: "다른 계정으로 로그인",
            loading: switchingAccount,
            onClick: () => void handleSwitchAccount(),
          }}
          title="현재 계정으로 수락할 수 없습니다"
        />
      </AuthLayout>
    );
  }

  if (errorView === "already-member") {
    return (
      <AuthLayout description="초대 링크를 확인한 뒤 프로젝트에 참여할 수 있습니다." title="프로젝트 초대">
        <JoinErrorCard
          description={errorMessage}
          onProjects={() => navigate("/projects")}
          title="이미 프로젝트에 참여 중입니다"
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      description="초대 링크를 확인한 뒤 프로젝트에 참여할 수 있습니다."
      title="프로젝트 초대"
    >
      <div className="auth-card auth-card--centered">
        <div className="auth-card__header auth-card__header--left">
          <h1>프로젝트 초대를 받았습니다</h1>
          <p>
            {isLoggedIn
              ? "로그인한 계정으로 초대를 수락하면 프로젝트에 참여합니다."
              : "로그인 또는 회원가입 후 이 화면으로 돌아와 초대를 수락할 수 있습니다."}
          </p>
        </div>

        {errorView === "generic" && errorMessage ? (
          <p aria-live="polite" className="auth-card__feedback" role="alert">{errorMessage}</p>
        ) : null}

        {isLoggedIn ? (
          <Button fullWidth loading={accepting} onClick={() => void handleAccept()} variant="primary">
            프로젝트 참여하기
          </Button>
        ) : (
          <>
            <Link className="ui-button ui-button--primary ui-button--md ui-button--full" to={`/auth/login${authRedirect}`}>
              로그인 후 참여하기
            </Link>
            <p className="auth-card__switch">
              계정이 없으신가요? <Link to={`/auth/signup${authRedirect}`}>회원가입</Link>
            </p>
          </>
        )}

        <div className="auth-card__notice">
          <strong>초대 정보는 수락 후에 확인할 수 있습니다.</strong>
          <p>프로젝트 이름과 역할은 참여 완료 후 프로젝트 홈에서 확인할 수 있습니다.</p>
        </div>
      </div>
    </AuthLayout>
  );
}

function JoinErrorCard({
  title,
  description,
  onProjects,
  secondaryAction,
}: {
  title: string;
  description: string;
  onProjects: () => void;
  secondaryAction?: {
    label: string;
    to?: string;
    onClick?: () => void;
    loading?: boolean;
  };
}) {
  return (
    <div className="auth-card auth-card--centered">
      <div className="auth-card__header">
        <h1>{title}</h1>
        <p role="alert">{description}</p>
      </div>
      <Button fullWidth onClick={onProjects} variant="primary">
        프로젝트 목록으로
      </Button>
      {secondaryAction?.onClick ? (
        <Button
          fullWidth
          loading={secondaryAction.loading}
          onClick={secondaryAction.onClick}
          variant="secondary"
        >
          {secondaryAction.label}
        </Button>
      ) : secondaryAction?.to ? (
        <p className="auth-card__switch">
          <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
        </p>
      ) : null}
    </div>
  );
}
