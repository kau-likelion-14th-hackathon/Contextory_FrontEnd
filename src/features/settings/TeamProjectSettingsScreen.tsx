import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer } from "../../shared/layouts";
import {
  Badge,
  Button,
  ConfirmDialog,
  FormField,
  Input,
  Modal,
  Tabs,
  type TabItem,
} from "../../shared/ui";
import {
  githubConnectionMock,
  projectSettingsMetadataMock,
  projectSettingsMock,
  repositoryScopeMock,
  syncStatusMock,
  teamMembersMock,
  teamSeatsMock,
  type ProjectSettingsFormValue,
  type TeamMemberViewModel,
} from "./teamProjectSettingsMock";
import { BillingSettingsPanel } from "./BillingSettingsPanel";
import { isBillingViewState } from "./billingSettingsMock";
import "./TeamProjectSettingsScreen.css";

type SettingsTab = "project" | "github" | "members" | "billing";

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
          {activeTab !== "billing" ? (
            <header className="team-project-settings__header">
              <h1>팀 및 프로젝트 설정</h1>
              <p aria-live="polite" className="team-project-settings__feedback">
                {feedback}
              </p>
            </header>
          ) : null}

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
              feedback={feedback}
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
  const [formValue, setFormValue] = useState<ProjectSettingsFormValue>(() => ({
    ...projectSettingsMock,
  }));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const updateField = (field: keyof ProjectSettingsFormValue, value: string) => {
    setFormValue((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormValue({ ...projectSettingsMock });
    onFeedback("프로젝트 정보 변경을 취소했습니다.");
  };

  const saveForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onFeedback("프로젝트 정보를 저장했습니다. 실제 서버에는 반영되지 않습니다.");
  };

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteConfirmation("");
  }, []);

  const confirmDelete = () => {
    if (deleteConfirmation !== projectSettingsMock.name) return;
    closeDeleteDialog();
    onFeedback("프로젝트 삭제 확인을 완료했습니다. 실제 프로젝트는 삭제되지 않았습니다.");
  };

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
          label="프로젝트 이름"
          onChange={(event) => updateField("name", event.target.value)}
          value={formValue.name}
        />
        <FormField
          label="한 줄 설명"
          onChange={(event) => updateField("summary", event.target.value)}
          value={formValue.summary}
        />
        <FormField
          label="프로젝트 목적"
          onChange={(event) => updateField("purpose", event.target.value)}
          value={formValue.purpose}
        />
        <FormField label="기본 언어" readOnly value={formValue.language} />
        <div className="settings-actions settings-actions--end">
          <Button onClick={resetForm} variant="secondary">변경 취소</Button>
          <Button type="submit">변경사항 저장</Button>
        </div>
      </form>

      <div className="team-project-settings__side-column">
        <section className="settings-card settings-metadata">
          <h2>프로젝트 메타 정보</h2>
          <dl>
            {projectSettingsMetadataMock.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="settings-card settings-danger-zone">
          <h2>Danger Zone</h2>
          <h3>프로젝트 삭제</h3>
          <p>
            프로젝트 기록과 팀원 연결, GitHub 연동 정보를 영구 삭제합니다.
            삭제 전 프로젝트명 재입력이 필요합니다.
          </p>
          <Button onClick={() => setDeleteDialogOpen(true)} variant="danger">
            프로젝트 삭제
          </Button>
        </section>
      </div>

      <Modal
        description="프로젝트 기록, 팀원 연결, GitHub 연동 정보가 삭제됩니다. 이 작업은 복구할 수 없습니다."
        onClose={closeDeleteDialog}
        open={deleteDialogOpen}
        title="프로젝트를 영구 삭제하시겠어요?"
      >
        <div className="settings-delete-dialog">
          <label htmlFor="project-delete-confirmation">
            계속하려면 프로젝트 이름을 입력하세요.
          </label>
          <Input
            autoComplete="off"
            id="project-delete-confirmation"
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="Contextory Web 입력"
            value={deleteConfirmation}
          />
          <div className="settings-actions settings-actions--end">
            <Button onClick={closeDeleteDialog} variant="secondary">취소</Button>
            <Button
              disabled={deleteConfirmation !== projectSettingsMock.name}
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
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const closeDisconnectDialog = useCallback(() => setDisconnectDialogOpen(false), []);
  const confirmDisconnect = useCallback(() => {
    setDisconnectDialogOpen(false);
    onFeedback("저장소 연결 해제를 확인했습니다. 실제 연결은 유지됩니다.");
  }, [onFeedback]);

  useEffect(() => {
    if (!syncing) return;

    const timer = window.setTimeout(() => {
      setSyncing(false);
      onFeedback("GitHub 저장소 동기화를 완료했습니다.");
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [onFeedback, syncing]);

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
            <strong>{githubConnectionMock.account} 계정 연결됨</strong>
            <p>저장소 접근 권한을 가진 GitHub 계정</p>
          </div>
          <Badge variant="success">연결됨</Badge>
        </div>

        <section className="settings-repository" aria-label="연결 저장소">
          <h3>{githubConnectionMock.repository}</h3>
          <p>
            {githubConnectionMock.visibility} · 기본 브랜치 {githubConnectionMock.defaultBranch}
            {" · "}{githubConnectionMock.permission}
          </p>
          <dl>
            <div>
              <dt>마지막 성공 동기화</dt>
              <dd>{githubConnectionMock.lastSyncedAt}</dd>
            </div>
            <div>
              <dt>수집 범위</dt>
              <dd>{githubConnectionMock.collectionScope}</dd>
            </div>
          </dl>
        </section>

        <div className="settings-actions">
          <Button
            onClick={() => onFeedback("저장소 변경 기능은 현재 API와 연결되어 있지 않습니다.")}
            variant="secondary"
          >
            저장소 변경
          </Button>
          <Button
            onClick={() => onFeedback("GitHub 저장소 접근 권한을 확인했습니다.")}
            variant="secondary"
          >
            권한 다시 확인
          </Button>
          <Button onClick={() => setDisconnectDialogOpen(true)} variant="secondary">
            연결 해제
          </Button>
        </div>
      </section>

      <div className="team-project-settings__side-column">
        <section className="settings-card settings-sync-status">
          <h2>동기화 상태</h2>
          <Badge variant="success">{syncing ? "동기화 중" : syncStatusMock.status}</Badge>
          <dl>
            <div>
              <dt>최근 성공</dt>
              <dd>{syncStatusMock.lastSuccess}</dd>
            </div>
            <div>
              <dt>다음 자동 확인</dt>
              <dd>{syncStatusMock.nextCheck}</dd>
            </div>
          </dl>
          <Button
            aria-label="GitHub 저장소 지금 동기화"
            loading={syncing}
            onClick={() => {
              setSyncing(true);
              onFeedback("GitHub 저장소를 동기화하고 있습니다.");
            }}
          >
            {syncing ? "동기화 중" : "지금 동기화"}
          </Button>
        </section>

        <section className="settings-repository-scope">
          <h2>MVP 연결 범위</h2>
          <ul>
            {repositoryScopeMock.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <ConfirmDialog
        cancelText="취소"
        confirmText="연결 해제"
        description="저장소 연결을 해제해도 승인된 프로젝트 기록은 유지됩니다. 실제 GitHub 연결 정보는 변경되지 않습니다."
        onCancel={closeDisconnectDialog}
        onConfirm={confirmDisconnect}
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
