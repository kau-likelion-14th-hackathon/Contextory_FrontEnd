import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button, Input, Modal } from "../../shared/ui";
import { TopBar } from "../workspace/components/TopBar";
import {
  accountProfileMock,
  accountSections,
  connectedAccountMock,
  type AccountSectionId,
} from "./accountSettingsMock";
import "./AccountSettingsScreen.css";

type AccountLocationState = {
  from?: unknown;
};

function getProjectReturnPath(state: unknown) {
  const from = (state as AccountLocationState | null)?.from;
  if (typeof from !== "string") return "/projects";

  try {
    const url = new URL(from, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/projects/")) {
      return "/projects";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/projects";
  }
}

export function AccountSettingsScreen() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<AccountSectionId>("account-profile");
  const [feedback, setFeedback] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const returnPath = getProjectReturnPath(location.state);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteConfirmation("");
  }, []);

  const openDeleteModal = () => {
    setDeleteConfirmation("");
    setDeleteModalOpen(true);
  };

  const confirmDeleteAccount = () => {
    if (deleteConfirmation !== "DELETE") return;
    closeDeleteModal();
    setFeedback("회원 탈퇴 기능은 아직 연결되지 않았습니다.");
  };

  return (
    <div className="account-settings-route">
      <TopBar
        onProfileFeedback={setFeedback}
        user={accountProfileMock.name}
        userEmail={accountProfileMock.email}
      />

      <main className="account-settings">
        <header className="account-settings__header">
          <h1>내 계정</h1>
          <p>개인 프로필, 로그인 방식과 계정 보안을 관리하세요.</p>
          <p aria-live="polite" className="account-settings__feedback">{feedback}</p>
        </header>

        <div className="account-settings__layout">
          <nav aria-label="계정 설정" className="account-settings__nav">
            <strong>계정 설정</strong>
            <ul>
              {accountSections.map((section) => (
                <li key={section.id}>
                  <a
                    aria-current={activeSection === section.id ? "location" : undefined}
                    className={activeSection === section.id ? "account-settings__nav-link account-settings__nav-link--active" : "account-settings__nav-link"}
                    href={`#${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
            <Link className="account-settings__back-link" to={returnPath}>
              ← 프로젝트로 돌아가기
            </Link>
          </nav>

          <div className="account-settings__content">
            <section className="account-card" id="account-profile" tabIndex={-1}>
              <h2>프로필</h2>
              <div className="account-card__row account-profile-row">
                <span aria-hidden="true" className="account-avatar account-avatar--large">
                  {accountProfileMock.avatar}
                </span>
                <div className="account-card__copy">
                  <h3>{accountProfileMock.name}</h3>
                  <p>{accountProfileMock.email} · 가입일 {accountProfileMock.joinedAt}</p>
                </div>
                <Button
                  onClick={() => setFeedback("프로필 수정 기능은 아직 연결되지 않았습니다.")}
                  size="sm"
                  variant="secondary"
                >
                  프로필 수정
                </Button>
              </div>
            </section>

            <section className="account-card" id="account-security" tabIndex={-1}>
              <h2>로그인 및 보안</h2>
              <AccountActionRow
                action="비밀번호 변경"
                description="Contextory 이메일 계정 비밀번호를 변경합니다."
                onClick={() => setFeedback("비밀번호 변경 기능은 아직 연결되지 않았습니다.")}
                title="비밀번호"
              />
              <AccountActionRow
                action="로그아웃"
                description="현재 기기를 포함해 로그인 상태를 관리합니다."
                onClick={() => setFeedback("로그아웃 기능은 아직 연결되지 않았습니다.")}
                title="로그인 세션"
              />
            </section>

            <section className="account-card" id="account-connections" tabIndex={-1}>
              <h2>연결된 계정</h2>
              <div className="account-card__row account-connection-row">
                <span aria-hidden="true" className="account-github-mark">GH</span>
                <div className="account-card__copy">
                  <h3>{connectedAccountMock.provider} · {connectedAccountMock.account}</h3>
                  <p>{connectedAccountMock.description}</p>
                </div>
                <Button
                  onClick={() => setFeedback("GitHub 계정 연결 해제 기능은 아직 연결되지 않았습니다.")}
                  size="sm"
                  variant="secondary"
                >
                  연결 해제
                </Button>
              </div>
            </section>

            <section aria-labelledby="account-danger-title" className="account-card account-danger-zone">
              <h2 id="account-danger-title">Danger Zone</h2>
              <div className="account-card__row account-danger-row">
                <div className="account-card__copy">
                  <h3>회원 탈퇴</h3>
                  <p>계정과 개인 데이터를 삭제합니다. 관리자 프로젝트가 있으면 권한 이전이 먼저 필요합니다.</p>
                </div>
                <Button onClick={openDeleteModal} size="sm" variant="danger">회원 탈퇴</Button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Modal onClose={closeDeleteModal} open={deleteModalOpen} title="회원 탈퇴">
        <div className="account-delete-dialog">
          <div className="account-delete-dialog__warning">
            <h3>정말 Contextory를 탈퇴하시겠어요?</h3>
            <p>계정과 개인 데이터가 삭제되며 복구할 수 없습니다. 관리자 프로젝트가 있다면 먼저 권한을 이전해야 합니다.</p>
          </div>
          <label htmlFor="account-delete-confirmation">계속하려면 DELETE를 입력하세요.</label>
          <Input
            autoComplete="off"
            id="account-delete-confirmation"
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="DELETE 입력"
            value={deleteConfirmation}
          />
          <div className="account-delete-dialog__actions">
            <Button onClick={closeDeleteModal} variant="secondary">취소</Button>
            <Button
              disabled={deleteConfirmation !== "DELETE"}
              onClick={confirmDeleteAccount}
              variant="danger"
            >
              회원 탈퇴
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AccountActionRow({
  action,
  description,
  onClick,
  title,
}: {
  action: string;
  description: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <div className="account-card__row account-security-row">
      <div className="account-card__copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <Button onClick={onClick} size="sm" variant="secondary">{action}</Button>
    </div>
  );
}
