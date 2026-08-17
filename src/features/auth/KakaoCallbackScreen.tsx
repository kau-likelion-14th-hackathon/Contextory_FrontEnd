import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiConfig, getApiErrorMessage } from "../../shared/api/client";
import { setSession } from "../../shared/api/session";
import { AuthLayout } from "../../shared/layouts";
import { kakaoLogin, toAuthSession } from "./authApi";
import { consumeKakaoPersistence } from "./kakaoAuth";
import "./Auth.css";

type CallbackState = "loading" | "error";

export function KakaoCallbackScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("카카오 인증 정보를 확인하고 있습니다.");
  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) {
      setState("error");
      setMessage("카카오 인증 코드가 없습니다. 로그인 화면에서 다시 시도해주세요.");
      return;
    }

    let active = true;

    kakaoLogin({
      code,
      isDevelop: apiConfig.appEnv !== "production",
    })
      .then((response) => {
        if (!active) return;
        setSession(toAuthSession(response), consumeKakaoPersistence());
        navigate("/projects", { replace: true });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState("error");
        setMessage(getApiErrorMessage(error, "카카오 로그인에 실패했습니다."));
      });

    return () => {
      active = false;
    };
  }, [code, navigate]);

  return (
    <AuthLayout title="카카오 로그인" description="카카오 인증 결과를 Contextory 계정과 연결합니다.">
      <div className="auth-card auth-card--centered">
        <div className="auth-card__header">
          <h1>{state === "loading" ? "카카오 로그인 처리 중" : "카카오 로그인 실패"}</h1>
          <p aria-live={state === "loading" ? "polite" : undefined} role={state === "error" ? "alert" : "status"}>
            {message}
          </p>
        </div>
        {state === "error" ? (
          <Link className="ui-button ui-button--primary ui-button--md" to="/auth/login">
            로그인으로 돌아가기
          </Link>
        ) : null}
      </div>
    </AuthLayout>
  );
}
