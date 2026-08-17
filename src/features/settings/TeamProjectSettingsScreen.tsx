import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { PageContainer } from "../../shared/layouts";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  Tabs,
  type TabItem,
} from "../../shared/ui";
import {
  repositoryScopeMock,
  teamMembersMock,
  teamSeatsMock,
  type TeamMemberViewModel,
} from "./teamProjectSettingsMock";
import {
  connectProjectRepository,
  disconnectProjectRepository,
  getGitHubConnectUrl,
  getGitHubRepositories,
  getProjectRepository,
  isProjectRepositoryNotConnectedError,
  type GitHubRepository,
  type GitHubRepositoryListResponse,
  type ProjectRepositoryConnectionResponse,
  type ProjectRepositoryDetail,
} from "../github/githubRepositoryApi";
import {
  deleteProject,
  updateProject,
  type ProjectDetailResponse,
  type ProjectLanguage,
  type UpdateProjectRequest,
} from "../project/projectApi";
import type { ProjectWorkspaceContextValue } from "../workspace/WorkspaceShell";
import { BillingSettingsPanel, stateDescriptions } from "./BillingSettingsPanel";
import { isBillingViewState } from "./billingSettingsMock";
import "./TeamProjectSettingsScreen.css";

type SettingsTab = "project" | "github" | "members" | "billing";

type ProjectSettingsFormValue = {
  name: string;
  summary: string;
  purpose: string;
  defaultLanguage: ProjectLanguage | "";
};

function toProjectSettingsForm(project: ProjectDetailResponse): ProjectSettingsFormValue {
  return {
    defaultLanguage: project.defaultLanguage ?? "",
    name: project.name,
    purpose: project.purpose ?? "",
    summary: project.summary ?? "",
  };
}

const settingsTabs: TabItem[] = [
  { id: "project", label: "프로젝트 정보" },
  { id: "github", label: "GitHub 저장소" },
  { id: "members", label: "팀원 및 역할" },
  { id: "billing", label: "결제 및 플랜" },
];

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === "project" || value === "github" || value === "members" || value === "billing";
}

export function TeamProjectSettingsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SettingsTab = isSettingsTab(tabParam) ? tabParam : "members";
  const billingStateParam = searchParams.get("billingState");
  const billingState = isBillingViewState(billingStateParam) ? billingStateParam : "default";
  const [feedback, setFeedback] = useState("");

  const changeTab = (tabId: string) => {
    if (!isSettingsTab(tabId)) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    setSearchParams(nextParams, { replace: true });
    setFeedback("");
  };

  return (
    <main className="team-project-settings">
      <PageContainer size="full">
        <div className="team-project-settings__content">
          {activeTab === "billing" ? (
            <header className="billing-settings__header">
              <div>
                <h1>결제 및 플랜</h1>
                <p>{stateDescriptions[billingState]}</p>
                <p aria-live="polite" className="billing-settings__feedback">{feedback}</p>
              </div>
              <Button
                className="billing-settings__history-button"
                onClick={() => setFeedback("결제 내역 기능은 현재 결제 시스템과 연결되어 있지 않습니다.")}
                size="sm"
                variant="secondary"
              >
                결제 내역
              </Button>
            </header>
          ) : (
            <header className="team-project-settings__header">
              <h1>팀 및 프로젝트 설정</h1>
              <p aria-live="polite" className="team-project-settings__feedback">
                {feedback}
              </p>
            </header>
          )}

          <div className="team-project-settings__tabs">
            <Tabs
              activeTab={activeTab}
              ariaLabel="팀 및 프로젝트 설정"
              onChange={changeTab}
              tabs={settingsTabs}
            />
          </div>

          {activeTab === "project" ? (
            <ProjectInfoPanel onFeedback={setFeedback} />
          ) : null}
          {activeTab === "github" ? (
            <GitHubRepositoryPanel onFeedback={setFeedback} />
          ) : null}
          {activeTab === "members" ? (
            <MembersPanel onFeedback={setFeedback} />
          ) : null}
          {activeTab === "billing" ? (
            <BillingSettingsPanel
              onFeedback={setFeedback}
              state={billingState}
            />
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}

function ProjectInfoPanel({ onFeedback }: { onFeedback: (message: string) => void }) {
  const navigate = useNavigate();
  const {
    project,
    projectError,
    projectLoading,
    reloadProject,
    setProjectDetail,
  } = useOutletContext<ProjectWorkspaceContextValue>();
  const [formValue, setFormValue] = useState<ProjectSettingsFormValue>();
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (project) setFormValue(toProjectSettingsForm(project));
  }, [project]);

  const updateField = (field: keyof ProjectSettingsFormValue, value: string) => {
    setFormValue((current) => current ? { ...current, [field]: value } : current);
  };

  const resetForm = () => {
    if (!project) return;
    setFormValue(toProjectSettingsForm(project));
    onFeedback("프로젝트 정보 변경을 취소했습니다.");
  };

  const saveForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project || !formValue || saving) return;

    const name = formValue.name.trim();
    if (!name) {
      onFeedback("프로젝트 이름을 입력해주세요.");
      return;
    }

    const body: UpdateProjectRequest = {};
    if (name !== project.name) body.name = name;
    if (formValue.summary !== (project.summary ?? "")) body.summary = formValue.summary;
    if (formValue.purpose !== (project.purpose ?? "")) body.purpose = formValue.purpose;
    if (formValue.defaultLanguage && formValue.defaultLanguage !== project.defaultLanguage) {
      body.defaultLanguage = formValue.defaultLanguage;
    }

    if (Object.keys(body).length === 0) {
      onFeedback("변경된 프로젝트 정보가 없습니다.");
      return;
    }

    setSaving(true);
    onFeedback("");

    try {
      const response = await updateProject(project.projectId, body);
      const nextProject: ProjectDetailResponse = {
        ...project,
        ...body,
        name: response.name,
        status: response.status,
      };
      setProjectDetail(nextProject);
      setFormValue(toProjectSettingsForm(nextProject));
      const refreshedProject = await reloadProject();
      if (refreshedProject) {
        setFormValue(toProjectSettingsForm(refreshedProject));
        onFeedback("프로젝트 정보를 저장했습니다.");
      } else {
        onFeedback("프로젝트 정보는 저장했지만 최신 정보를 다시 불러오지 못했습니다.");
      }
    } catch (error) {
      onFeedback(getApiErrorMessage(error, "프로젝트 정보를 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return;
    setDeleteDialogOpen(false);
    setDeleteConfirmation("");
    setDeleteError("");
  }, [deleting]);

  const confirmDelete = async () => {
    if (!project || deleteConfirmation !== project.name || deleting) return;
    setDeleting(true);
    setDeleteError("");

    try {
      await deleteProject(project.projectId);
      navigate("/projects", { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, "프로젝트를 삭제하지 못했습니다.");
      setDeleteError(message);
      onFeedback(message);
      setDeleting(false);
    }
  };

  if (projectLoading && !project) {
    return (
      <section aria-label="프로젝트 정보 설정" role="tabpanel">
        <LoadingState
          description="프로젝트 설정에 필요한 정보를 가져오고 있습니다."
          title="프로젝트 정보를 불러오는 중입니다"
        />
      </section>
    );
  }

  if (!project || !formValue) {
    return (
      <section aria-label="프로젝트 정보 설정" role="tabpanel">
        <ErrorState
          action={{ label: "다시 불러오기", onClick: () => void reloadProject() }}
          description={projectError || "프로젝트 정보를 확인할 수 없습니다."}
          title="프로젝트 정보를 불러오지 못했습니다"
        />
      </section>
    );
  }

  return (
    <section
      aria-label="프로젝트 정보 설정"
      className="team-project-settings__two-column"
      role="tabpanel"
    >
      <form className="settings-card settings-project-form" onSubmit={saveForm}>
        <SettingsCardHeading
          description="프로젝트 이름과 목적 등 AI 분석에 사용하는 기본 정보를 관리합니다."
          title="프로젝트 정보"
        />
        <FormField
          disabled={saving}
          label="프로젝트 이름"
          maxLength={150}
          onChange={(event) => updateField("name", event.target.value)}
          value={formValue.name}
        />
        <FormField
          disabled={saving}
          label="한 줄 설명"
          maxLength={500}
          onChange={(event) => updateField("summary", event.target.value)}
          value={formValue.summary}
        />
        <FormField
          disabled={saving}
          label="프로젝트 목적"
          onChange={(event) => updateField("purpose", event.target.value)}
          value={formValue.purpose}
        />
        <div className="form-field">
          <label className="form-field__label" htmlFor="project-default-language">기본 언어</label>
          <select
            className="ui-input"
            disabled={saving}
            id="project-default-language"
            onChange={(event) => updateField("defaultLanguage", event.target.value)}
            value={formValue.defaultLanguage}
          >
            <option disabled value="">언어 정보 없음</option>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="settings-actions settings-actions--end">
          <Button disabled={saving} onClick={resetForm} variant="secondary">변경 취소</Button>
          <Button loading={saving} type="submit">변경사항 저장</Button>
        </div>
      </form>

      <div className="team-project-settings__side-column">
        <section className="settings-card settings-metadata">
          <h2>프로젝트 메타 정보</h2>
          <dl>
            <div><dt>프로젝트 ID</dt><dd>{project.projectId}</dd></div>
            <div><dt>프로젝트 식별자</dt><dd>{project.slug || "—"}</dd></div>
            <div><dt>상태</dt><dd>{project.status}</dd></div>
            <div><dt>내 권한</dt><dd>{project.myPermissionRole}</dd></div>
          </dl>
        </section>

        <section className="settings-card settings-danger-zone">
          <h2>Danger Zone</h2>
          <h3>프로젝트 삭제</h3>
          <p>
            프로젝트 삭제를 서버에 요청합니다. 삭제 전 프로젝트명 재입력이 필요합니다.
          </p>
          <Button onClick={() => {
            setDeleteDialogOpen(true);
            setDeleteError("");
          }} variant="danger">
            프로젝트 삭제
          </Button>
        </section>
      </div>

      <Modal
        description="프로젝트 삭제 후 처리 방식은 서버 정책을 따릅니다. 계속하려면 실제 프로젝트명을 확인해주세요."
        onClose={closeDeleteDialog}
        open={deleteDialogOpen}
        title="프로젝트를 삭제하시겠어요?"
      >
        <div className="settings-delete-dialog">
          <label htmlFor="project-delete-confirmation">
            계속하려면 프로젝트 이름을 입력하세요.
          </label>
          <Input
            autoComplete="off"
            id="project-delete-confirmation"
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            disabled={deleting}
            placeholder={`${project.name} 입력`}
            value={deleteConfirmation}
          />
          {deleteError ? <p className="form-field__error" role="alert">{deleteError}</p> : null}
          <div className="settings-actions settings-actions--end">
            <Button disabled={deleting} onClick={closeDeleteDialog} variant="secondary">취소</Button>
            <Button
              disabled={deleteConfirmation !== project.name}
              loading={deleting}
              onClick={confirmDelete}
              variant="danger"
            >
              프로젝트 삭제
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function GitHubRepositoryPanel({ onFeedback }: { onFeedback: (message: string) => void }) {
  const {
    project,
    reloadProject,
    setProjectDetail,
  } = useOutletContext<ProjectWorkspaceContextValue>();
  const [repository, setRepository] = useState<
    ProjectRepositoryDetail | ProjectRepositoryConnectionResponse | null
  >();
  const [repositoryLoading, setRepositoryLoading] = useState(true);
  const [repositoryError, setRepositoryError] = useState("");
  const [repositoryDialogOpen, setRepositoryDialogOpen] = useState(false);
  const [repositoryPage, setRepositoryPage] = useState(1);
  const [repositoryList, setRepositoryList] = useState<GitHubRepositoryListResponse>();
  const [repositoryListLoading, setRepositoryListLoading] = useState(false);
  const [repositoryListError, setRepositoryListError] = useState("");
  const [repositoryListRetryKey, setRepositoryListRetryKey] = useState(0);
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepository>();
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [connectingGitHub, setConnectingGitHub] = useState(false);
  const [updatingRepository, setUpdatingRepository] = useState(false);
  const projectId = project?.projectId;
  const permissionRole = project?.myPermissionRole?.toUpperCase();
  const canManageRepository = permissionRole === "OWNER" || permissionRole === "ADMIN";

  const loadProjectRepository = useCallback(async (signal?: AbortSignal) => {
    if (!projectId) return undefined;

    setRepositoryLoading(true);
    setRepositoryError("");

    try {
      const result = await getProjectRepository(projectId, signal);
      if (signal?.aborted) return undefined;
      setRepository(result);
      return result;
    } catch (error) {
      if (signal?.aborted) return undefined;
      if (isProjectRepositoryNotConnectedError(error)) {
        setRepository(null);
        return null;
      }
      setRepositoryError(getApiErrorMessage(error, "연결된 저장소 정보를 불러오지 못했습니다."));
      return undefined;
    } finally {
      if (!signal?.aborted) setRepositoryLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    setRepository(undefined);
    void loadProjectRepository(controller.signal);
    return () => controller.abort();
  }, [loadProjectRepository]);

  useEffect(() => {
    if (!repositoryDialogOpen) return;

    const controller = new AbortController();
    setRepositoryListLoading(true);
    setRepositoryListError("");

    void getGitHubRepositories({ page: repositoryPage }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setRepositoryList(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRepositoryListError(
          getApiErrorMessage(error, "접근 가능한 GitHub 저장소를 불러오지 못했습니다."),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setRepositoryListLoading(false);
      });

    return () => controller.abort();
  }, [repositoryDialogOpen, repositoryListRetryKey, repositoryPage]);

  const startGitHubConnection = async () => {
    if (connectingGitHub || !projectId) return;
    setConnectingGitHub(true);
    onFeedback("");

    try {
      const { installUrl } = await getGitHubConnectUrl(projectId);
      window.location.assign(installUrl);
    } catch (error) {
      onFeedback(getApiErrorMessage(error, "GitHub 연결을 시작하지 못했습니다."));
      setConnectingGitHub(false);
    }
  };

  const openRepositoryDialog = () => {
    if (!canManageRepository) return;
    setRepositoryPage(1);
    setRepositoryList(undefined);
    setRepositoryListError("");
    setSelectedRepository(undefined);
    setRepositoryDialogOpen(true);
  };

  const closeRepositoryDialog = useCallback(() => {
    if (updatingRepository) return;
    setRepositoryDialogOpen(false);
  }, [updatingRepository]);

  const saveRepository = async () => {
    if (!project || !selectedRepository || updatingRepository || !canManageRepository) return;
    const replacingRepository = repository !== null && repository !== undefined;
    setUpdatingRepository(true);
    onFeedback("");

    try {
      const updatedRepository = await connectProjectRepository(project.projectId, {
        githubRepositoryId: selectedRepository.githubRepositoryId,
        repositoryFullName: selectedRepository.repositoryFullName,
      });
      setRepository(updatedRepository);
      setProjectDetail({
        ...project,
        repository: {
          connected: true,
          repositoryFullName: updatedRepository.repositoryFullName,
        },
      });
      setRepositoryDialogOpen(false);
      onFeedback(replacingRepository ? "GitHub 저장소를 교체했습니다." : "GitHub 저장소를 연결했습니다.");
      await Promise.all([loadProjectRepository(), reloadProject()]);
    } catch (error) {
      onFeedback(getApiErrorMessage(error, "GitHub 저장소를 연결하지 못했습니다."));
    } finally {
      setUpdatingRepository(false);
    }
  };

  const closeDisconnectDialog = useCallback(() => {
    if (!updatingRepository) setDisconnectDialogOpen(false);
  }, [updatingRepository]);

  const confirmDisconnect = useCallback(async () => {
    if (!project || updatingRepository || !canManageRepository) return;
    setUpdatingRepository(true);
    onFeedback("");

    try {
      await disconnectProjectRepository(project.projectId);
      setRepository(null);
      setProjectDetail({
        ...project,
        repository: { connected: false, repositoryFullName: null },
      });
      setDisconnectDialogOpen(false);
      onFeedback("GitHub 저장소 연결을 해제했습니다.");
      await reloadProject();
    } catch (error) {
      onFeedback(getApiErrorMessage(error, "GitHub 저장소 연결을 해제하지 못했습니다."));
    } finally {
      setUpdatingRepository(false);
    }
  }, [canManageRepository, onFeedback, project, reloadProject, setProjectDetail, updatingRepository]);

  const repositoryListContent = repositoryList?.content ?? [];
  const repositoryDetail = repository && "repositoryUrl" in repository ? repository : undefined;

  return (
    <section
      aria-label="GitHub 저장소 설정"
      className="team-project-settings__two-column"
      role="tabpanel"
    >
      <section className="settings-card settings-github-main">
        <SettingsCardHeading
          description="프로젝트 변경을 수집할 저장소와 연결 상태를 관리합니다."
          title="GitHub 저장소"
        />

        <div className="settings-github-account">
          <span aria-hidden="true" className="settings-github-mark">GH</span>
          <div>
            <strong>GitHub App 연결</strong>
            <p>접근 가능한 저장소를 불러오려면 GitHub App 권한이 필요합니다.</p>
          </div>
          <Badge variant={repository ? "success" : "neutral"}>
            {repository ? "저장소 연결됨" : "연결 확인 필요"}
          </Badge>
        </div>

        {repositoryLoading && repository === undefined ? (
          <LoadingState
            description="현재 프로젝트에 연결된 저장소를 확인하고 있습니다."
            title="저장소 정보를 불러오는 중입니다"
          />
        ) : repositoryError && repository === undefined ? (
          <ErrorState
            action={{ label: "다시 시도", onClick: () => void loadProjectRepository() }}
            description={repositoryError}
            title="저장소 정보를 불러오지 못했습니다"
          />
        ) : repository ? (
          <section className="settings-repository" aria-label="연결 저장소">
            <h3>{repository.repositoryFullName}</h3>
            <p>
              {repositoryDetail
                ? `${repositoryDetail.private ? "Private" : "Public"} · 기본 브랜치 ${repositoryDetail.defaultBranch || "—"}`
                : "상세 정보를 다시 확인하고 있습니다."}
            </p>
            <dl>
              <div>
                <dt>마지막 동기화</dt>
                <dd>{repositoryDetail?.lastSyncedAt || "—"}</dd>
              </div>
              <div>
                <dt>연결한 사용자 ID</dt>
                <dd>{repository.connectedBy ?? "—"}</dd>
              </div>
            </dl>
            {repositoryDetail ? (
              <a
                className="settings-repository__link"
                href={repositoryDetail.repositoryUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub에서 {repository.repositoryFullName} 저장소 보기
              </a>
            ) : null}
          </section>
        ) : (
          <div className="settings-repository settings-repository--empty">
            <h3>연결된 저장소가 없습니다</h3>
            <p>GitHub App 권한을 연결한 뒤 프로젝트에서 사용할 저장소 하나를 선택할 수 있습니다.</p>
          </div>
        )}

        {repositoryError && repository ? (
          <p className="settings-github-warning" role="alert">{repositoryError}</p>
        ) : null}

        {canManageRepository ? (
          <div className="settings-actions">
            <Button loading={connectingGitHub} onClick={() => void startGitHubConnection()} variant="secondary">
              GitHub App 연결
            </Button>
            <Button disabled={repositoryLoading} onClick={openRepositoryDialog} variant="secondary">
              {repository ? "저장소 변경" : "저장소 선택"}
            </Button>
            {repository ? (
              <Button onClick={() => setDisconnectDialogOpen(true)} variant="secondary">
                연결 해제
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="settings-github-readonly">
            현재 권한은 저장소 정보를 조회할 수 있으며 연결, 교체, 해제는 OWNER 또는 ADMIN만 가능합니다.
          </p>
        )}
      </section>

      <div className="team-project-settings__side-column">
        <section className="settings-card settings-sync-status">
          <h2>연결 정보</h2>
          <Badge variant={repository ? "success" : "neutral"}>
            {repository ? "연결됨" : "미연결"}
          </Badge>
          <dl>
            <div>
              <dt>저장소 ID</dt>
              <dd>{repository?.githubRepositoryId ?? "—"}</dd>
            </div>
            <div>
              <dt>기본 브랜치</dt>
              <dd>{repositoryDetail?.defaultBranch || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="settings-repository-scope">
          <h2>MVP 연결 범위</h2>
          <ul>
            {repositoryScopeMock.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <Modal
        closeOnBackdrop={!updatingRepository}
        closeOnEscape={!updatingRepository}
        description="GitHub App에서 접근을 허용한 저장소 중 프로젝트에 연결할 저장소 하나를 선택하세요."
        onClose={closeRepositoryDialog}
        open={repositoryDialogOpen}
        title={repository ? "GitHub 저장소 변경" : "GitHub 저장소 연결"}
      >
        <div className="settings-repository-picker">
          {repositoryListLoading && !repositoryList ? (
            <LoadingState
              description="GitHub App에서 접근 가능한 저장소를 확인하고 있습니다."
              title="저장소 목록을 불러오는 중입니다"
            />
          ) : repositoryListError ? (
            <ErrorState
              action={{
                label: "다시 시도",
                onClick: () => {
                  setRepositoryList(undefined);
                  setRepositoryListError("");
                  setRepositoryListRetryKey((key) => key + 1);
                },
              }}
              description={repositoryListError}
              secondaryAction={{ label: "GitHub App 연결", onClick: () => void startGitHubConnection() }}
              title="저장소 목록을 불러오지 못했습니다"
            />
          ) : repositoryListContent.length === 0 ? (
            <EmptyState
              action={{ label: "GitHub App 연결", onClick: () => void startGitHubConnection() }}
              description="GitHub App에서 저장소 접근 권한을 허용한 뒤 다시 확인해주세요."
              title="접근 가능한 저장소가 없습니다"
            />
          ) : (
            <fieldset className="settings-repository-list">
              <legend>연결할 저장소</legend>
              {repositoryListContent.map((item) => (
                <div className="settings-repository-option" key={item.githubRepositoryId}>
                  <label>
                    <input
                      checked={selectedRepository?.githubRepositoryId === item.githubRepositoryId}
                      disabled={updatingRepository}
                      name="github-repository"
                      onChange={() => setSelectedRepository(item)}
                      type="radio"
                    />
                    <span>
                      <strong>{item.repositoryFullName}</strong>
                      <small>{item.private ? "Private" : "Public"} · 기본 브랜치 {item.defaultBranch || "—"}</small>
                    </span>
                  </label>
                  <a
                    aria-label={`${item.repositoryFullName} GitHub에서 보기`}
                    href={item.repositoryUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    보기
                  </a>
                </div>
              ))}
            </fieldset>
          )}

          {repositoryList ? (
            <nav aria-label="GitHub 저장소 목록 페이지" className="settings-repository-pagination">
              <Button
                aria-label="이전 저장소 페이지"
                disabled={repositoryPage <= 1 || repositoryListLoading}
                onClick={() => setRepositoryPage((page) => Math.max(1, page - 1))}
                size="sm"
                variant="secondary"
              >
                이전
              </Button>
              <span>{repositoryList.page}페이지</span>
              <Button
                aria-label="다음 저장소 페이지"
                disabled={!repositoryList.hasNext || repositoryListLoading}
                onClick={() => setRepositoryPage((page) => page + 1)}
                size="sm"
                variant="secondary"
              >
                다음
              </Button>
            </nav>
          ) : null}

          <div className="settings-actions settings-actions--end">
            <Button disabled={updatingRepository} onClick={closeRepositoryDialog} variant="secondary">
              취소
            </Button>
            <Button
              disabled={!selectedRepository}
              loading={updatingRepository}
              onClick={() => void saveRepository()}
            >
              {repository ? "저장소 교체" : "저장소 연결"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        cancelText="취소"
        confirmText="연결 해제"
        description="저장소 연결을 해제해도 승인된 프로젝트 기록은 유지됩니다."
        loading={updatingRepository}
        onCancel={closeDisconnectDialog}
        onConfirm={() => void confirmDisconnect()}
        open={disconnectDialogOpen}
        title="GitHub 저장소 연결을 해제하시겠어요?"
        variant="danger"
      />
    </section>
  );
}

function MembersPanel({ onFeedback }: { onFeedback: (message: string) => void }) {
  return (
    <section
      aria-label="팀원 및 역할 설정"
      className="settings-members-panel"
      role="tabpanel"
    >
      <div className="settings-members-banner">
        <span aria-hidden="true" className="settings-members-banner__icon">ⓘ</span>
        <p>역할은 AI 영향도 분석 결과의 우선순위와 프로젝트 권한 범위에 영향을 줄 수 있습니다.</p>
        <strong>{teamSeatsMock.used} / {teamSeatsMock.total} seats used</strong>
        <Button
          onClick={() => onFeedback("팀원 초대 기능은 현재 API와 연결되어 있지 않습니다.")}
          size="sm"
        >
          팀원 초대
        </Button>
      </div>

      <div className="settings-members-table-wrap">
        <table className="settings-members-table">
          <thead>
            <tr>
              <th scope="col">이름</th>
              <th scope="col">이메일</th>
              <th scope="col">역할</th>
              <th scope="col">권한 수준</th>
              <th scope="col">작업</th>
            </tr>
          </thead>
          <tbody>
            {teamMembersMock.map((member) => (
              <MemberTableRow key={member.id} member={member} onFeedback={onFeedback} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MemberTableRow({
  member,
  onFeedback,
}: {
  member: TeamMemberViewModel;
  onFeedback: (message: string) => void;
}) {
  const displayName = member.currentUser ? `${member.name} (나)` : member.name;

  return (
    <tr>
      <th data-label="이름" scope="row">
        <span className="settings-member-identity">
          <span aria-hidden="true" className="settings-member-avatar">
            {member.name.slice(0, 1)}
          </span>
          <span className="settings-member-name">{displayName}</span>
        </span>
      </th>
      <td data-label="이메일">{member.email}</td>
      <td data-label="역할"><Badge variant="success">{member.role}</Badge></td>
      <td data-label="권한 수준">{member.permission}</td>
      <td data-label="작업">
        <div className="settings-member-actions">
          <Button
            aria-label={`${displayName} 역할 편집`}
            onClick={() => onFeedback(`${displayName} 역할 편집은 현재 API와 연결되어 있지 않습니다.`)}
            size="sm"
            variant="secondary"
          >
            편집
          </Button>
          <Button
            aria-label={`${displayName} 기타 작업`}
            onClick={() => onFeedback(`${displayName}의 추가 작업은 현재 준비 중입니다.`)}
            size="sm"
            variant="secondary"
          >
            ⋯
          </Button>
        </div>
      </td>
    </tr>
  );
}

function SettingsCardHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className="settings-card-heading">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}
