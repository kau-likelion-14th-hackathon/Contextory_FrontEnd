import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import {
  clearSession,
  getCurrentUser,
  updateSessionUser,
} from "../../shared/api/session";
import { Button, FormField, Input, Modal } from "../../shared/ui";
import { logout, withdraw } from "../auth/authApi";
import { TopBar } from "../workspace/components/TopBar";
import {
  getMyInfo,
  updateMyInfo,
  type MyInfoResponse,
} from "./accountApi";
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
  const navigate = useNavigate();
  const sessionUser = getCurrentUser();
  const [activeSection, setActiveSection] = useState<AccountSectionId>("account-profile");
  const [feedback, setFeedback] = useState("");
  const [profile, setProfile] = useState<MyInfoResponse | null>(() =>
    sessionUser
      ? {
          introduction: sessionUser.introduction,
          loginId: sessionUser.loginId,
          profileImage: sessionUser.profileImage,
          userId: sessionUser.id,
          username: sessionUser.username,
        }
      : null,
  );
  const [profileDraft, setProfileDraft] = useState({
    introduction: sessionUser?.introduction ?? "",
    username: sessionUser?.username ?? "",
  });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const returnPath = getProjectReturnPath(location.state);

  useEffect(() => {
    let active = true;

    getMyInfo()
      .then((response) => {
        if (!active) return;
        setProfile(response);
        setProfileDraft({
          introduction: response.introduction,
          username: response.username,
        });
        updateSessionUser({
          id: response.userId,
          introduction: response.introduction,
          loginId: response.loginId,
          profileImage: response.profileImage,
          username: response.username,
        });
      })
      .catch((error: unknown) => {
        if (active) setFeedback(getApiErrorMessage(error, "사용자 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteConfirmation("");
    setDeleteError("");
  }, []);

  const openDeleteModal = () => {
    setDeleteConfirmation("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    setDeleteLoading(true);
    setDeleteError("");

    try {
      await withdraw();
      clearSession();
      closeDeleteModal();
      navigate("/auth/login", {
        replace: true,
        state: { authFeedback: "회원 탈퇴가 완료되었습니다." },
      });
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, "회원 탈퇴에 실패했습니다."));
      setDeleteLoading(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = profileDraft.username.trim();

    if (!username) {
      setProfileError("사용자명을 입력해주세요.");
      return;
    }

    setProfileSaving(true);
    setProfileError("");

    try {
      const response = await updateMyInfo({
        introduction: profileDraft.introduction,
        username,
      });
      const nextProfile: MyInfoResponse = {
        ...profile,
        introduction: response.introduction,
        loginId: profile?.loginId ?? sessionUser?.loginId ?? "",
        profileImage: profile?.profileImage ?? sessionUser?.profileImage ?? "",
        userId: response.userId,
        username: response.username,
      };
      setProfile(nextProfile);
      setProfileDraft({
        introduction: response.introduction,
        username: response.username,
      });
      updateSessionUser({
        id: response.userId,
        introduction: response.introduction,
        loginId: nextProfile.loginId,
        profileImage: nextProfile.profileImage,
        username: response.username,
      });
      setProfileEditing(false);
      setFeedback("프로필 정보가 저장되었습니다.");
    } catch (error) {
      setProfileError(getApiErrorMessage(error, "프로필 정보를 저장하지 못했습니다."));
    } finally {
      setProfileSaving(false);
    }
  };

  const cancelProfileEdit = () => {
    setProfileDraft({
      introduction: profile?.introduction ?? "",
      username: profile?.username ?? "",
    });
    setProfileError("");
    setProfileEditing(false);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);

    try {
      await logout();
      navigate("/auth/login", {
        replace: true,
        state: { authFeedback: "로그아웃되었습니다." },
      });
    } catch (error) {
      navigate("/auth/login", {
        replace: true,
        state: {
          authFeedback: `${getApiErrorMessage(error, "서버 로그아웃 요청에 실패했습니다.")} 로컬 로그인 정보는 정리되었습니다.`,
        },
      });
    }
  };

  const profileName = profile?.username ?? accountProfileMock.name;
  const profileEmail = profile?.loginId ?? accountProfileMock.email;
  const profileIntroduction = profile?.introduction || "소개가 등록되지 않았습니다.";

  return (
    <div className="account-settings-route">
      <TopBar
        onProfileFeedback={setFeedback}
        user={profileName}
        userEmail={profileEmail}
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
                  {profileName.slice(0, 1)}
                </span>
                <div className="account-card__copy">
                  <h3>{profileName}</h3>
                  <p>{profileEmail}</p>
                  <p>{profileIntroduction}</p>
                </div>
                <Button
                  disabled={profileLoading}
                  onClick={() => {
                    setProfileError("");
                    setProfileEditing(true);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  프로필 수정
                </Button>
              </div>
              {profileEditing ? (
                <form className="account-profile-form" onSubmit={saveProfile}>
                  <FormField
                    errorMessage={!profileDraft.username.trim() ? profileError : undefined}
                    id="account-profile-username"
                    label="사용자명"
                    onChange={(event) => {
                      setProfileDraft((current) => ({ ...current, username: event.target.value }));
                      setProfileError("");
                    }}
                    required
                    value={profileDraft.username}
                  />
                  <label className="account-profile-form__introduction" htmlFor="account-profile-introduction">
                    <span>소개</span>
                    <textarea
                      className="ui-input"
                      id="account-profile-introduction"
                      onChange={(event) => setProfileDraft((current) => ({
                        ...current,
                        introduction: event.target.value,
                      }))}
                      value={profileDraft.introduction}
                    />
                  </label>
                  {profileError && profileDraft.username.trim() ? (
                    <p className="account-profile-form__error" role="alert">{profileError}</p>
                  ) : null}
                  <div className="account-profile-form__actions">
                    <Button disabled={profileSaving} onClick={cancelProfileEdit} variant="secondary">취소</Button>
                    <Button loading={profileSaving} type="submit">저장</Button>
                  </div>
                </form>
              ) : null}
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
                loading={logoutLoading}
                onClick={handleLogout}
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
            disabled={deleteLoading}
            id="account-delete-confirmation"
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="DELETE 입력"
            value={deleteConfirmation}
          />
          {deleteError ? <p className="account-delete-dialog__error" role="alert">{deleteError}</p> : null}
          <div className="account-delete-dialog__actions">
            <Button disabled={deleteLoading} onClick={closeDeleteModal} variant="secondary">취소</Button>
            <Button
              disabled={deleteConfirmation !== "DELETE"}
              loading={deleteLoading}
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
  loading = false,
  onClick,
  title,
}: {
  action: string;
  description: string;
  loading?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <div className="account-card__row account-security-row">
      <div className="account-card__copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <Button loading={loading} onClick={onClick} size="sm" variant="secondary">{action}</Button>
    </div>
  );
}
