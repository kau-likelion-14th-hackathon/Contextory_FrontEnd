import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../../shared/layouts";
import { Button } from "../../shared/ui";
import "./Auth.css";

export type ProjectJoinStatus = "invited" | "expired" | "already-joined";

function isProjectJoinStatus(value: string | null): value is ProjectJoinStatus {
  return value === "invited" || value === "expired" || value === "already-joined";
}

// TODO: 초대 상세 조회 API 연결되면 token으로 실제 데이터 조회
const invitationMock = {
  projectId: "contextory-web",
  projectName: "Contextory Web",
  inviter: "홍길동 · 프로젝트 관리자",
  role: "프론트엔드",
  repository: "team/contextory-web",
};

export function ProjectJoinScreen() {
  const { token } = useParams();
  void token; // TODO:초대 상세 조회 API 붙일 때 사용 예정

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get("status");
  const status: ProjectJoinStatus = isProjectJoinStatus(statusParam) ? statusParam : "invited";

  function handleAccept() {
    // POST /api/invitations/{token}/accept 연결
    // TODO: 로그인 안 된 상태면 로그인/회원가입으로 보내고 -> 완료 후 이 화면으로 복귀시키는 처리 필요
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
        {status === "invited" ? (
          <>
            <span aria-hidden="true" className="auth-card__project-badge">
              {invitationMock.projectName.charAt(0)}
            </span>
            <div className="auth-card__header auth-card__header--left">
              <h1>{invitationMock.projectName}에 초대받았어요</h1>
              <p>프로젝트 정보를 확인하고 참여하세요.</p>
            </div>

            <dl className="auth-card__info-list">
              <div>
                <dt>프로젝트</dt>
                <dd>{invitationMock.projectName}</dd>
              </div>
              <div>
                <dt>초대한 사람</dt>
                <dd>{invitationMock.inviter}</dd>
              </div>
              <div>
                <dt>내 역할</dt>
                <dd>{invitationMock.role}</dd>
              </div>
              <div>
                <dt>GitHub 저장소</dt>
                <dd>{invitationMock.repository}</dd>
              </div>
            </dl>

            <Button fullWidth onClick={handleAccept} variant="primary">
              프로젝트 참여하기
            </Button>

            <div className="auth-card__notice">
              <strong>로그인하지 않은 경우에도 초대 정보는 유지됩니다.</strong>
              <p>로그인 또는 회원가입 완료 후 이 프로젝트 참여 화면으로<br/>다시 돌아옵니다.</p>
            </div>
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
              <h1>초대 링크가 만료되었습니다</h1>
              <p>
                이 초대 링크는 더 이상 사용할 수 없습니다.
                <br />
                프로젝트 관리자에게 새 초대 링크를 요청해주세요.
              </p>
            </div>

            <dl className="auth-card__info-list">
              <div>
                <dt>프로젝트</dt>
                <dd>{invitationMock.projectName}</dd>
              </div>
              <div>
                <dt>초대 상태</dt>
                <dd>만료됨</dd>
              </div>
            </dl>

            <Button fullWidth onClick={() => navigate("/projects")} variant="primary">
              프로젝트 목록으로
            </Button>

            <p className="auth-card__switch">새 링크를 받았다면 다시 열어주세요</p>
          </>
        ) : null}

        {status === "already-joined" ? (
          <>
            <span aria-hidden="true" className="auth-card__icon auth-card__icon--success">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="auth-card__header">
              <h1>이미 참여 중인 프로젝트예요</h1>
              <p>
                {invitationMock.projectName} 프로젝트의 팀원으로 이미 등록되어 있습니다.
                <br />
                바로 프로젝트 홈으로 이동할 수 있어요.
              </p>
            </div>

            <dl className="auth-card__info-list">
              <div>
                <dt>프로젝트</dt>
                <dd>{invitationMock.projectName}</dd>
              </div>
              <div>
                <dt>내 역할</dt>
                <dd>{invitationMock.role}</dd>
              </div>
            </dl>

            <Button
              fullWidth
              onClick={() => navigate(`/projects/${invitationMock.projectId}/home`)}
              variant="primary"
            >
              프로젝트로 이동
            </Button>

            <p className="auth-card__switch">
              <Link to="/projects">프로젝트 목록 보기</Link>
            </p>
          </>
        ) : null}
      </div>
    </AuthLayout>
  );
}