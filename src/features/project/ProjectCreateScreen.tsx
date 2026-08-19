import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { ButtonGroup, PageContainer } from "../../shared/layouts";
import { Button, FormField } from "../../shared/ui";
import { TopBar } from "../workspace/components/TopBar";
import { createProject } from "./projectApi";
import {
  initialProjectCreateFormValues,
  projectLanguageOptions,
  toCreateProjectRequest,
  validateProjectCreateForm,
  type ProjectCreateFormErrors,
  type ProjectCreateFormValues,
} from "./projectCreateForm";
import "./ProjectCreateScreen.css";

export function ProjectCreateScreen() {
  const navigate = useNavigate();
  const [values, setValues] = useState<ProjectCreateFormValues>(initialProjectCreateFormValues);
  const [errors, setErrors] = useState<ProjectCreateFormErrors>({});
  const [feedback, setFeedback] = useState("");
  const [creating, setCreating] = useState(false);

  const updateField = <K extends keyof ProjectCreateFormValues>(
    field: K,
    value: ProjectCreateFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;

    const nextErrors = validateProjectCreateForm(values);
    setErrors(nextErrors);
    const firstErrorField = (Object.keys(nextErrors) as Array<keyof ProjectCreateFormErrors>)[0];
    if (firstErrorField) {
      setFeedback("필수 입력 항목을 확인해주세요.");
      window.requestAnimationFrame(() => {
        document.getElementById(`project-create-${firstErrorField}`)?.focus();
      });
      return;
    }

    setCreating(true);
    setFeedback("");

    try {
      const result = await createProject(toCreateProjectRequest(values));
      navigate(`/projects/${result.projectId}/home`, {
        replace: true,
        state: { projectName: result.name },
      });
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "프로젝트를 생성하지 못했습니다. 다시 시도해주세요."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="project-create">
      <TopBar title="새 프로젝트" user="홍길동" />
      <PageContainer size="lg">
        <div className="project-create__content">
          <h1 className="project-create__visually-hidden">새 프로젝트</h1>
          <header className="project-create__intro">
            <p className="eyebrow">PROJECT SETUP</p>
            <p>프로젝트 기본 정보를 입력해 생성합니다.</p>
            <p aria-live="polite" className="project-create__feedback">{feedback}</p>
          </header>

          <section aria-labelledby="project-create-basic-title" className="project-create__panel">
            <div className="project-create__panel-heading">
              <span aria-hidden="true">01</span>
              <div>
                <h2 id="project-create-basic-title">기본 정보</h2>
                <p>AI가 프로젝트 맥락을 이해하는 데 필요한 기준 정보를 입력하세요.</p>
              </div>
            </div>

            <div className="project-create__notice">
              <strong>생성 후 설정 안내</strong>
              <p>
                GitHub 연결과 팀원 초대는 프로젝트 생성 후 설정에서 진행할 수 있습니다.
              </p>
            </div>

            <form className="project-create__form" noValidate onSubmit={(event) => void submit(event)}>
              <FormField
                autoComplete="organization"
                errorMessage={errors.name}
                id="project-create-name"
                label="프로젝트 이름 *"
                maxLength={150}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="예: Contextory Web"
                required
                value={values.name}
              />
              <FormField
                autoCapitalize="none"
                autoComplete="off"
                errorMessage={errors.slug}
                id="project-create-slug"
                label="프로젝트 식별자 *"
                maxLength={150}
                onChange={(event) => updateField("slug", event.target.value)}
                placeholder="예: contextory-web"
                required
                value={values.slug}
              />
              <FormField
                errorMessage={errors.summary}
                id="project-create-summary"
                label="한 줄 설명 *"
                maxLength={500}
                onChange={(event) => updateField("summary", event.target.value)}
                placeholder="프로젝트를 한 문장으로 설명해주세요."
                required
                value={values.summary}
              />
              <TextAreaField
                error={errors.purpose}
                id="project-create-purpose"
                label="프로젝트 목적 *"
                onChange={(value) => updateField("purpose", value)}
                placeholder="이 프로젝트가 해결하려는 문제와 목표를 입력해주세요."
                value={values.purpose}
              />
              <div className="project-create__field">
                <label htmlFor="project-create-defaultLanguage">기본 언어 *</label>
                <select
                  aria-describedby={errors.defaultLanguage ? "project-create-defaultLanguage-error" : undefined}
                  aria-invalid={Boolean(errors.defaultLanguage) || undefined}
                  id="project-create-defaultLanguage"
                  onChange={(event) => {
                    updateField(
                      "defaultLanguage",
                      event.target.value as ProjectCreateFormValues["defaultLanguage"],
                    );
                  }}
                  required
                  value={values.defaultLanguage}
                >
                  {projectLanguageOptions.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </select>
                {errors.defaultLanguage ? (
                  <p className="project-create__error" id="project-create-defaultLanguage-error">
                    {errors.defaultLanguage}
                  </p>
                ) : null}
              </div>
              <ButtonGroup align="end">
                <Link className="ui-button ui-button--secondary ui-button--md" to="/projects">
                  취소
                </Link>
                <Button loading={creating} type="submit">
                  프로젝트 생성
                </Button>
              </ButtonGroup>
            </form>
          </section>
        </div>
      </PageContainer>
    </main>
  );
}

function TextAreaField({
  error,
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
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
