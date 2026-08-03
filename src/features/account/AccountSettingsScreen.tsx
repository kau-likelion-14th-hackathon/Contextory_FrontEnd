import { Link } from "react-router-dom";
import { PageContainer } from "../../shared/layouts";

export function AccountSettingsScreen() {
  return (
    <main>
      <PageContainer>
      <section className="content-section">
        <h1>Account Settings</h1>
        <p className="text-muted">
          개인 계정 설정은 프로젝트 사이드바가 아니라 상단 사용자 메뉴에서
          진입합니다. 실제 세션과 계정 API 명세가 확정되면 프로필, 비밀번호
          변경, GitHub 계정 연결 상태를 이 영역에 연결합니다.
        </p>
        <Link className="ui-button ui-button--secondary ui-button--md" to="/auth/login">
          Back to login
        </Link>
      </section>
      </PageContainer>
    </main>
  );
}
