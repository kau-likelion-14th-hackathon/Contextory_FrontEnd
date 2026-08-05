import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../shared/layouts";
import { Button, FormField, Tabs } from "../../shared/ui";
import "./Auth.css";

export type AuthMode = "login" | "signup";

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleTabChange(id: string) {
    navigate(id === "login" ? "/auth/login" : "/auth/signup");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // TODO: /api/auth/login, /api/auth/signup 명세 확정되면 실제 요청으로 교체
    // 지금은 입력값 검증 없이 화면 흐름만 확인
    navigate("/projects");
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
        <div className="auth-card__header">
          <h1>{mode === "login" ? "로그인" : "계정 만들기"}</h1>
          <p>
            {mode === "login"
              ? "Contextory 계정으로 계속하세요."
              : "Contextory 계정으로 프로젝트 맥락을 관리하세요."}
          </p>
        </div>

        <Tabs
          ariaLabel="인증 방식 선택"
          activeTab={mode}
          onChange={handleTabChange}
          tabs={[
            { id: "login", label: "로그인" },
            { id: "signup", label: "회원가입" },
          ]}
        />

        <form className="auth-card__form" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <FormField
              label="이름"
              placeholder="홍길동"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          ) : null}

          <FormField
            label="이메일"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <FormField
            label="비밀번호"
            type="password"
            placeholder={mode === "login" ? "비밀번호를 입력하세요" : "8자 이상 입력해주세요"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {mode === "signup" ? (
            <FormField
              label="비밀번호 확인"
              type="password"
              placeholder="비밀번호를 다시 입력해주세요"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
          ) : null}

          {mode === "login" ? (
            <div className="auth-card__row">
              <label className="auth-card__checkbox">
                <input
                  checked={keepSignedIn}
                  onChange={(event) => setKeepSignedIn(event.target.checked)}
                  type="checkbox"
                />
                로그인 상태 유지
              </label>
              <Link to="/auth/forgot-password">비밀번호 찾기</Link>
            </div>
          ) : (
            <label className="auth-card__checkbox">
              <input
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                type="checkbox"
              />
              이용약관 및 개인정보 처리방침에 동의합니다.
            </label>
          )}

          <Button fullWidth loading={loading} type="submit" variant="primary">
            {mode === "login" ? "로그인" : "회원가입"}
          </Button>
        </form>

        <div className="auth-card__divider">
          <span>또는</span>
        </div>

        <Button fullWidth variant="secondary">
          GitHub로 계속하기
        </Button>

        <p className="auth-card__switch">
          {mode === "login" ? (
            <>
              계정이 없으신가요? <Link to="/auth/signup">회원가입</Link>
            </>
          ) : (
            <>
              이미 계정이 있으신가요? <Link to="/auth/login">로그인</Link>
            </>
          )}
        </p>

        <div className="auth-card__notice">
          {mode === "login" ? (
            <>
              <strong>Contextory 자체 계정과 GitHub 연동은 분리됩니다.</strong>
              <p>GitHub는 프로젝트 데이터 연결 수단으로 사용할 수 있어요.</p>
            </>
          ) : (
            <>
              <strong>GitHub 로그인과 저장소 연결은 별개입니다.</strong>
              <p>GitHub는 로그인 수단으로 연결할 수 있고, 프로젝트 저장소는 생성 과정에서 따로 연결합니다.</p>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}