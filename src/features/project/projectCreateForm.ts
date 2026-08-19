import type { CreateProjectRequest, ProjectLanguage } from "./projectApi";

export const projectLanguageOptions = [
  { label: "한국어", value: "ko" },
  { label: "English", value: "en" },
] as const satisfies ReadonlyArray<{ label: string; value: ProjectLanguage }>;

export type ProjectCreateFormValues = {
  name: string;
  slug: string;
  summary: string;
  purpose: string;
  defaultLanguage: ProjectLanguage;
};

export type ProjectCreateFormErrors = Partial<Record<keyof ProjectCreateFormValues, string>>;

export const initialProjectCreateFormValues: ProjectCreateFormValues = {
  name: "",
  slug: "",
  summary: "",
  purpose: "",
  defaultLanguage: "ko",
};

export function validateProjectCreateForm(values: ProjectCreateFormValues): ProjectCreateFormErrors {
  const errors: ProjectCreateFormErrors = {};

  if (!values.name.trim()) errors.name = "프로젝트 이름을 입력해주세요.";
  if (!values.slug.trim()) errors.slug = "프로젝트 식별자를 입력해주세요.";
  if (!values.summary.trim()) errors.summary = "한 줄 설명을 입력해주세요.";
  if (!values.purpose.trim()) errors.purpose = "프로젝트 목적을 입력해주세요.";
  if (!values.defaultLanguage) errors.defaultLanguage = "기본 언어를 선택해주세요.";

  return errors;
}

export function toCreateProjectRequest(values: ProjectCreateFormValues): CreateProjectRequest {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    summary: values.summary.trim() || undefined,
    purpose: values.purpose.trim() || undefined,
    defaultLanguage: values.defaultLanguage,
  };
}
