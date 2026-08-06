import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../../shared/layouts";
import { Button, FormField } from "../../shared/ui";
import "./Auth.css";

export type PasswordRecoveryMode = "request" | "reset";

export function PasswordRecoveryScreen({ mode }: { mode: PasswordRecoveryMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // 비밀번호 재설정 API 명세 확정되면 토큰으로 실제 이메일 조회
  const verifiedEmail = "hong@example.com";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // 화면 흐름 확인용으로 로딩 상태만 흉내냄 (실제 요청 없음)
    setLoading(true);
    window.setTimeout(() => setLoading(false), 800);
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
      <div className="auth-card">
        {mode === "request" ? (
          <>
            <div className="auth-card__header">
              <h1>비밀번호 찾기</h1>
              <p>가입한 이메일로 비밀번호 재설정 링크를 보내드릴게요.</p>
            </div>
            
            <span aria-hidden="true" className="auth-card__icon auth-card__icon--pending">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 5L2 7" />
              </svg>
            </span>

            <form className="auth-card__form" onSubmit={handleSubmit}>
              <FormField
                label="이메일"  
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button fullWidth loading={loading} type="submit" variant="primary">
                재설정 링크 보내기
              </Button>
            </form>

            <div className="auth-card__notice">
              <strong>메일을 받지 못했다면</strong>
              <p>스팸함을 확인하거나 가입한 이메일 주소가 맞는지 확인해주세요.</p>
            </div>

            <p className="auth-card__switch">
              <Link to="/auth/login">← 로그인으로 돌아가기</Link>
            </p>
          </>
        ) : (
          <>
            <div className="auth-card__header">
              <h1>새 비밀번호 설정</h1>
              <p>새로운 비밀번호를 입력해주세요.</p>
            </div>

            <div className="auth-card__notice auth-card__notice--success">
              <p>✓ {verifiedEmail} 인증 완료</p>
            </div>

            <form className="auth-card__form" onSubmit={handleSubmit}>
              <FormField
                label="새 비밀번호"
                type="password"
                placeholder="8자 이상 입력해주세요"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <FormField
                label="비밀번호 확인"
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
              <Button fullWidth loading={loading} type="submit" variant="primary">
                비밀번호 변경
              </Button>
            </form>

            <div className="auth-card__notice">
              <strong>안전한 비밀번호 기준</strong>
              <ul>
                <li>8자 이상</li>
                <li>영문과 숫자 조합 권장</li>
                <li>기존 비밀번호와 다른 값 사용</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}