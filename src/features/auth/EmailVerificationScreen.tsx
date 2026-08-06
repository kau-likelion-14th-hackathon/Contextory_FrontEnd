import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../../shared/layouts";
import { Button } from "../../shared/ui";
import "./Auth.css";

export type EmailVerificationStatus = "pending" | "success" | "expired";

function isEmailVerificationStatus(value: string | null): value is EmailVerificationStatus {
  return value === "pending" || value === "success" || value === "expired";
}

export function EmailVerificationScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get("status");
  const status: EmailVerificationStatus = isEmailVerificationStatus(statusParam)
    ? statusParam
    : "pending";

  // TODO: 이메일 인증 API 명세 확정되면 교체
  const verifiedEmail = "hong@example.com";

    function handlePrimaryAction() {
    if (status === "success") {
        navigate("/projects");
        return;
    }
    // TODO: status === "pending" | "expired" — 둘 다 인증 메일 재발송
    // 이메일 인증 API 명세 확정되면 실제 재발송 요청 연결
    }

  return (
    <AuthLayout
      title={
        <span className="auth-layout-shell__brand-title">
          <span>프로젝트의 맥락을 이해하고,</span>
          <span className="auth-layout-shell__brand-title--accent">
            더 나은 협업을 만들어가세요
          </span>
        </span>
      }
      description={
        <>
          GitHub 변경을 수집하고 AI가 분석한 맥락을
          <br />
          검토·승인하여 팀의 프로젝트 메모리로 남깁니다.
        </>
      }
    >
      <div className="auth-card auth-card--centered">
        {status === "pending" ? (
        <>
          <span aria-hidden="true" className="auth-card__icon auth-card__icon--pending">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 5L2 7" />
            </svg>
          </span>
            <div className="auth-card__header">
            <h1>이메일을 확인해주세요</h1>
            <p>
                {verifiedEmail}으로 인증 메일을 보냈습니다.
                <br />
                메일의 인증 버튼을 눌러 회원가입을 완료해주세요.
            </p>
            </div>

            <div className="auth-card__notice">
            <p>인증 메일은 30분 동안 유효합니다.</p>
            <p>메일이 보이지 않으면 스팸함도 확인해주세요.</p>
            </div>

            <Button fullWidth onClick={handlePrimaryAction} variant="primary">
            인증 메일 다시 보내기
            </Button>

            <p className="auth-card__switch">
            이메일을 잘못 입력했나요? <Link to="/auth/signup">이메일 변경</Link>
            </p>
        </>
        ) : null}

        {status === "success" ? (
          <>
            <span aria-hidden="true" className="auth-card__icon auth-card__icon--success">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="auth-card__header">
              <h1>이메일 인증이 완료되었습니다</h1>
              <p>
                Contextory 계정이 활성화되었습니다.
                <br />
                이제 프로젝트를 만들거나 초대받은 프로젝트에 참여할 수 있어요.
              </p>
            </div>

            <dl className="auth-card__info-list">
              <div>
                <dt>인증 이메일</dt>
                <dd>{verifiedEmail}</dd>
              </div>
              <div>
                <dt>다음 단계</dt>
                <dd>프로젝트 선택 또는 초대 참여</dd>
              </div>
            </dl>

            <Button fullWidth onClick={handlePrimaryAction} variant="primary">
              프로젝트 시작하기
            </Button>

            <p className="auth-card__switch">
              <Link to="/auth/login">다른 계정으로 로그인</Link>
            </p>
          </>
        ) : null}

        {status === "expired" ? (
          <>
            <span aria-hidden="true" className="auth-card__icon auth-card__icon--warning">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16.5" x2="12" y2="16.51" />
              </svg>
            </span>
            <div className="auth-card__header">
              <h1>인증 링크가 만료되었습니다</h1>
              <p>
                보안을 위해 인증 링크의 유효 시간이 지났습니다.
                <br />
                새 인증 메일을 받아 다시 진행해주세요.
              </p>
            </div>

            <div className="auth-card__notice">
              <p>기존 인증 링크는 더 이상 사용할 수 없습니다.</p>
            </div>

            <Button fullWidth onClick={handlePrimaryAction} variant="primary">
              인증 메일 다시 보내기
            </Button>

            <p className="auth-card__switch">
              <Link to="/auth/login">로그인으로 돌아가기</Link>
            </p>
          </>
        ) : null}
      </div>
    </AuthLayout>
  );
}