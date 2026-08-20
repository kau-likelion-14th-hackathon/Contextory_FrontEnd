import { Link } from "react-router-dom";
import { AuthLayout } from "../../shared/layouts";
import "./Auth.css";

const brandTitle = (
  <span className="auth-layout-shell__brand-title">
    <span>프로젝트의 맥락을 이해하고,</span>
    <span className="auth-layout-shell__brand-title--accent">
      더 나은 협업을 만들어가세요
    </span>
  </span>
);

const brandDescription = (
  <>
    GitHub 변경을 수집하고 AI가 분석한 맥락을
    <br />
    검토·승인하여 팀의 프로젝트 메모리로 남깁니다.
  </>
);

export function EmailVerificationScreen() {
  return (
    <AuthLayout title={brandTitle} description={brandDescription}>
      <div className="auth-card auth-card--centered">
        <span aria-hidden="true" className="auth-card__icon auth-card__icon--pending">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 5L2 7" />
          </svg>
        </span>

        <div className="auth-card__header">
          <h1>이메일 인증 기능 준비 중</h1>
          <p role="status">
            현재 이메일 인증 기능을 준비하고 있습니다.
            <br />
            인증 메일 발송 및 확인은 아직 사용할 수 없습니다.
          </p>
        </div>

        <div className="auth-card__notice">
          <p>회원가입과 로그인은 이메일 인증 없이 이용할 수 있습니다.</p>
        </div>

        <p className="auth-card__switch">
          <Link to="/auth/login">로그인으로 돌아가기</Link>
          {" · "}
          <Link to="/auth/signup">회원가입</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
