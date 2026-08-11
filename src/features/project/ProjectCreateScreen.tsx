import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ButtonGroup, PageContainer } from "../../shared/layouts";
import { Badge, Button, FormField, Input } from "../../shared/ui";
import { TopBar } from "../workspace/components/TopBar";
import {
  invitationLinkMock,
  projectCreatorMock,
  projectLanguageOptions,
  projectRoleOptions,
  repositoryOptions,
  type ProjectRole,
  type RepositoryOption,
} from "./projectCreateMock";
import "./ProjectCreateScreen.css";

type WizardStep = 1 | 2 | 3;
type RepositoryStatus = "idle" | "connected" | "permission-error" | "connection-error";

type BasicInfo = {
  name: string;
  summary: string;
  purpose: string;
  features: string;
  roles: ProjectRole[];
  language: string;
};

type BasicInfoErrors = Partial<Record<keyof BasicInfo, string>>;

const steps = [
  { id: 1, label: "기본 정보" },
  { id: 2, label: "GitHub 연결" },
  { id: 3, label: "팀 설정" },
] as const;

const initialBasicInfo: BasicInfo = {
  name: "",
  summary: "",
  purpose: "",
  features: "",
  roles: [],
  language: "한국어",
};

export function ProjectCreateScreen() {
  const [step, setStep] = useState<WizardStep>(1);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(initialBasicInfo);
  const [basicInfoErrors, setBasicInfoErrors] = useState<BasicInfoErrors>({});
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [repositoryStatus, setRepositoryStatus] = useState<RepositoryStatus>("idle");
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [step, completed]);

  const moveToStep = (nextStep: WizardStep) => {
    setFeedback("");
    setStep(nextStep);
  };

  const updateBasicInfo = (field: keyof BasicInfo, value: string) => {
    setBasicInfo((current) => ({ ...current, [field]: value }));
    setBasicInfoErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleBasicRole = (role: ProjectRole) => {
    setBasicInfo((current) => ({
      ...current,
      roles: current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role],
    }));
    setBasicInfoErrors((current) => ({ ...current, roles: undefined }));
  };

  const submitBasicInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: BasicInfoErrors = {};

    if (!basicInfo.name.trim()) errors.name = "프로젝트 이름을 입력해주세요.";
    if (!basicInfo.summary.trim()) errors.summary = "한 줄 설명을 입력해주세요.";
    if (!basicInfo.purpose.trim()) errors.purpose = "프로젝트 목적을 입력해주세요.";
    if (!basicInfo.features.trim()) errors.features = "주요 기능을 입력해주세요.";
    if (basicInfo.roles.length === 0) errors.roles = "팀 역할을 하나 이상 선택해주세요.";
    if (!basicInfo.language) errors.language = "기본 언어를 선택해주세요.";

    setBasicInfoErrors(errors);
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      setFeedback("필수 입력 항목을 확인해주세요.");
      window.requestAnimationFrame(() => {
        document.getElementById(`project-create-${firstErrorField}`)?.focus();
      });
      return;
    }

    moveToStep(2);
  };

  const selectRepository = (repositoryId: string) => {
    setSelectedRepositoryId(repositoryId);
    setRepositoryStatus("idle");
    setFeedback("");
  };

  const checkRepository = () => {
    const repository = repositoryOptions.find((item) => item.id === selectedRepositoryId);
    if (!repository) {
      setFeedback("연결할 저장소를 선택해주세요.");
      return;
    }

    setRepositoryStatus(repository.connectionResult === "success" ? "connected" : repository.connectionResult);
    if (repository.connectionResult === "success") {
      setFeedback(`${repository.name} 저장소의 연결과 권한을 mock으로 확인했습니다.`);
    } else if (repository.connectionResult === "permission-error") {
      setFeedback("저장소 접근 권한이 없습니다. GitHub 관리자에게 권한을 요청해주세요.");
    } else {
      setFeedback("저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const submitRepository = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (repositoryStatus !== "connected") {
      setFeedback("다음 단계로 이동하려면 저장소 연결을 먼저 확인해주세요.");
      return;
    }
    moveToStep(3);
  };

  const completeProject = () => {
    setCompleted(true);
    setFeedback("프로젝트 생성 정보를 확인했습니다. 실제 프로젝트나 초대는 생성되지 않았습니다.");
  };

  return (
    <main className="project-create">
      <TopBar title="새 프로젝트" user={projectCreatorMock.name} />
      <PageContainer size="lg">
        <div className="project-create__content">
          <header className="project-create__intro">
            <p className="eyebrow">PROJECT SETUP</p>
            <p>프로젝트 맥락과 협업 기준을 3단계로 설정합니다.</p>
            <p aria-live="polite" className="project-create__feedback">{feedback}</p>
          </header>

          {!completed ? (
            <>
              <StepIndicator currentStep={step} onMove={moveToStep} />
              {step === 1 ? (
                <BasicInfoStep
                  errors={basicInfoErrors}
                  headingRef={stepHeadingRef}
                  onChange={updateBasicInfo}
                  onSubmit={submitBasicInfo}
                  onToggleRole={toggleBasicRole}
                  value={basicInfo}
                />
              ) : null}
              {step === 2 ? (
                <RepositoryStep
                  headingRef={stepHeadingRef}
                  onBack={() => moveToStep(1)}
                  onCheck={checkRepository}
                  onSelect={selectRepository}
                  onSubmit={submitRepository}
                  selectedRepositoryId={selectedRepositoryId}
                  status={repositoryStatus}
                />
              ) : null}
              {step === 3 ? (
                <TeamStep
                  headingRef={stepHeadingRef}
                  onBack={() => moveToStep(2)}
                  onComplete={completeProject}
                  onCopyLink={() => setFeedback("초대 링크 복사 기능은 아직 연결되지 않았습니다.")}
                />
              ) : null}
            </>
          ) : (
            <CompletionState headingRef={stepHeadingRef} />
          )}
        </div>
      </PageContainer>
    </main>
  );
}

function StepIndicator({ currentStep, onMove }: { currentStep: WizardStep; onMove: (step: WizardStep) => void }) {
  return (
    <nav aria-label="프로젝트 생성 단계" className="project-create__steps">
      <ol>
        {steps.map((item) => {
          const completed = item.id < currentStep;
          const current = item.id === currentStep;
          return (
            <li className={current ? "project-create__step project-create__step--current" : completed ? "project-create__step project-create__step--completed" : "project-create__step"} key={item.id}>
              <button
                aria-current={current ? "step" : undefined}
                disabled={!completed}
                onClick={() => completed && onMove(item.id)}
                type="button"
              >
                <span aria-hidden="true">{completed ? "✓" : item.id}</span>
                <span>
                  <small>{current ? "현재 단계" : completed ? "완료" : `${item.id}단계`}</small>
                  <strong>{item.label}</strong>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function BasicInfoStep({
  errors,
  headingRef,
  onChange,
  onSubmit,
  onToggleRole,
  value,
}: {
  errors: BasicInfoErrors;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onChange: (field: keyof BasicInfo, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleRole: (role: ProjectRole) => void;
  value: BasicInfo;
}) {
  return (
    <section aria-labelledby="project-create-basic-title" className="project-create__panel">
      <div className="project-create__panel-heading">
        <span aria-hidden="true">01</span>
        <div>
          <h2 id="project-create-basic-title" ref={headingRef} tabIndex={-1}>기본 정보</h2>
          <p>AI가 프로젝트 맥락을 이해하는 데 필요한 기준 정보를 입력하세요.</p>
        </div>
      </div>
      <form className="project-create__form" noValidate onSubmit={onSubmit}>
        <FormField
          autoComplete="organization"
          errorMessage={errors.name}
          id="project-create-name"
          label="프로젝트 이름 *"
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="예: Contextory Web"
          required
          value={value.name}
        />
        <FormField
          errorMessage={errors.summary}
          id="project-create-summary"
          label="한 줄 설명 *"
          maxLength={100}
          onChange={(event) => onChange("summary", event.target.value)}
          placeholder="프로젝트를 한 문장으로 설명해주세요."
          required
          value={value.summary}
        />
        <TextAreaField
          error={errors.purpose}
          id="project-create-purpose"
          label="프로젝트 목적 *"
          onChange={(value) => onChange("purpose", value)}
          placeholder="이 프로젝트가 해결하려는 문제와 목표를 입력해주세요."
          value={value.purpose}
        />
        <TextAreaField
          error={errors.features}
          id="project-create-features"
          label="주요 기능 *"
          onChange={(value) => onChange("features", value)}
          placeholder="주요 기능을 줄바꿈으로 구분해 입력해주세요."
          value={value.features}
        />
        <RoleCheckboxes
          error={errors.roles}
          id="project-create-roles"
          label="팀 역할 *"
          onToggle={onToggleRole}
          selected={value.roles}
        />
        <div className="project-create__field">
          <label htmlFor="project-create-language">기본 언어 *</label>
          <select
            aria-describedby={errors.language ? "project-create-language-error" : undefined}
            aria-invalid={Boolean(errors.language) || undefined}
            id="project-create-language"
            onChange={(event) => onChange("language", event.target.value)}
            required
            value={value.language}
          >
            {projectLanguageOptions.map((language) => <option key={language}>{language}</option>)}
          </select>
          {errors.language ? <p className="project-create__error" id="project-create-language-error">{errors.language}</p> : null}
        </div>
        <ButtonGroup align="end">
          <Link className="ui-button ui-button--secondary ui-button--md" to="/projects">취소</Link>
          <Button type="submit">다음: GitHub 연결</Button>
        </ButtonGroup>
      </form>
    </section>
  );
}

function RepositoryStep({
  headingRef,
  onBack,
  onCheck,
  onSelect,
  onSubmit,
  selectedRepositoryId,
  status,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onCheck: () => void;
  onSelect: (repositoryId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedRepositoryId: string;
  status: RepositoryStatus;
}) {
  return (
    <section aria-labelledby="project-create-github-title" className="project-create__panel">
      <div className="project-create__panel-heading">
        <span aria-hidden="true">02</span>
        <div>
          <h2 id="project-create-github-title" ref={headingRef} tabIndex={-1}>GitHub 연결</h2>
          <p>로그인 계정과 별도로 프로젝트에서 수집할 저장소 하나를 연결하세요.</p>
        </div>
      </div>
      <div className="project-create__notice">
        <strong>GitHub 계정 · hong-dev</strong>
        <p>GitHub 로그인 연결은 저장소 접근 권한을 자동으로 부여하지 않습니다. 저장소별 권한을 확인합니다.</p>
      </div>
      <form className="project-create__form" onSubmit={onSubmit}>
        <fieldset className="project-create__repositories">
          <legend>접근 가능한 저장소</legend>
          {repositoryOptions.map((repository) => (
            <RepositoryCard
              key={repository.id}
              onSelect={onSelect}
              repository={repository}
              selected={selectedRepositoryId === repository.id}
            />
          ))}
        </fieldset>
        <RepositoryStatusMessage status={status} />
        <div className="project-create__connection-actions">
          <Button onClick={onCheck} variant="secondary">연결 및 권한 확인</Button>
        </div>
        <ButtonGroup align="end">
          <Button onClick={onBack} variant="secondary">이전</Button>
          <Button disabled={status !== "connected"} type="submit">다음: 팀 설정</Button>
        </ButtonGroup>
      </form>
    </section>
  );
}

function RepositoryCard({ repository, selected, onSelect }: { repository: RepositoryOption; selected: boolean; onSelect: (repositoryId: string) => void }) {
  return (
    <label className={selected ? "project-create__repository project-create__repository--selected" : "project-create__repository"}>
      <input
        checked={selected}
        name="repository"
        onChange={() => onSelect(repository.id)}
        type="radio"
        value={repository.id}
      />
      <span className="project-create__repository-copy">
        <strong>{repository.name}</strong>
        <span>{repository.description}</span>
        <span className="project-create__repository-meta">
          <Badge variant={repository.visibility === "Private" ? "neutral" : "info"}>{repository.visibility}</Badge>
          <span>기본 브랜치 <code>{repository.defaultBranch}</code></span>
        </span>
      </span>
    </label>
  );
}

function RepositoryStatusMessage({ status }: { status: RepositoryStatus }) {
  if (status === "idle") {
    return (
      <div className="project-create__status project-create__status--idle">
        <strong>저장소 연결 전</strong>
        <p>저장소를 선택한 뒤 연결 및 권한 확인을 진행해주세요.</p>
      </div>
    );
  }
  const content = {
    connected: { className: "project-create__status project-create__status--success", title: "저장소 연결 확인 완료", body: "선택한 저장소의 기본 정보와 접근 권한을 mock으로 확인했습니다." },
    "permission-error": { className: "project-create__status project-create__status--error", title: "저장소 권한 확인 필요", body: "현재 GitHub 계정으로 저장소를 읽을 수 없습니다." },
    "connection-error": { className: "project-create__status project-create__status--error", title: "저장소 연결 실패", body: "mock 연결 오류가 발생했습니다. 다른 저장소를 선택하거나 다시 확인해주세요." },
  }[status];

  return (
    <div aria-live="polite" className={content.className} role={status === "connected" ? "status" : "alert"}>
      <strong>{content.title}</strong>
      <p>{content.body}</p>
    </div>
  );
}

function TeamStep({
  headingRef,
  onBack,
  onComplete,
  onCopyLink,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onComplete: () => void;
  onCopyLink: () => void;
}) {
  return (
    <section aria-labelledby="project-create-team-title" className="project-create__panel">
      <div className="project-create__panel-heading">
        <span aria-hidden="true">03</span>
        <div>
          <h2 id="project-create-team-title" ref={headingRef} tabIndex={-1}>팀 설정</h2>
          <p>초대 링크를 공유하고 참여한 팀원의 역할과 권한을 확인하세요.</p>
        </div>
      </div>
      <div className="project-create__invite-link">
        <label htmlFor="project-create-invite-link">프로젝트 초대 링크</label>
        <div>
          <Input id="project-create-invite-link" readOnly value={invitationLinkMock} />
          <Button onClick={onCopyLink} variant="secondary">초대 링크 복사</Button>
        </div>
        <p>프로젝트가 실제 생성되지 않으므로 현재 링크는 mock입니다.</p>
      </div>
      <section aria-labelledby="project-create-members-title" className="project-create__members">
        <div className="project-create__section-heading">
          <h3 id="project-create-members-title">팀원 목록</h3>
          <Badge>1명</Badge>
        </div>
        <ul>
          <li>
            <span aria-hidden="true" className="project-create__avatar">홍</span>
            <div>
              <strong>{projectCreatorMock.name} (나)</strong>
              <span>{projectCreatorMock.email}</span>
            </div>
            <div className="project-create__member-roles">
              {projectCreatorMock.roles.map((role) => <Badge key={role} variant="success">{role}</Badge>)}
            </div>
            <span className="project-create__member-state">관리자</span>
          </li>
        </ul>
        <p className="project-create__members-note">초대 링크로 참여한 팀원은 이 목록에서 역할과 권한을 설정할 수 있습니다.</p>
      </section>
      <ButtonGroup align="end">
        <Button onClick={onBack} variant="secondary">이전</Button>
        <Button onClick={onComplete}>프로젝트 생성 완료</Button>
      </ButtonGroup>
    </section>
  );
}

function RoleCheckboxes({ error, id, label, onToggle, selected }: { error?: string; id: string; label: string; onToggle: (role: ProjectRole) => void; selected: ProjectRole[] }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <fieldset aria-describedby={errorId} aria-invalid={Boolean(error) || undefined} className="project-create__roles" id={id} tabIndex={-1}>
      <legend>{label}</legend>
      <div>
        {projectRoleOptions.map((role) => (
          <label key={role}>
            <input checked={selected.includes(role)} onChange={() => onToggle(role)} type="checkbox" />
            <span>{role}</span>
          </label>
        ))}
      </div>
      {error ? <p className="project-create__error" id={errorId}>{error}</p> : null}
    </fieldset>
  );
}

function TextAreaField({ error, id, label, onChange, placeholder, value }: { error?: string; id: string; label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="project-create__field">
      <label htmlFor={id}>{label}</label>
      <textarea
        aria-describedby={errorId}
        aria-invalid={Boolean(error) || undefined}
        className={error ? "project-create__textarea project-create__control--invalid" : "project-create__textarea"}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        rows={4}
        value={value}
      />
      {error ? <p className="project-create__error" id={errorId}>{error}</p> : null}
    </div>
  );
}

function CompletionState({ headingRef }: { headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <section aria-labelledby="project-create-complete-title" className="project-create__complete">
      <span aria-hidden="true">✓</span>
      <h2 id="project-create-complete-title" ref={headingRef} tabIndex={-1}>프로젝트 생성 정보를 확인했어요</h2>
      <p>현재는 mock 완료 상태이며 실제 프로젝트, 저장소 연결, 팀원 초대는 생성되지 않았습니다.</p>
      <Link className="ui-button ui-button--primary ui-button--md" to="/projects">프로젝트 목록으로 이동</Link>
    </section>
  );
}
