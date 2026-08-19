import { describe, expect, it } from "vitest";
import {
  initialProjectCreateFormValues,
  toCreateProjectRequest,
  validateProjectCreateForm,
} from "./projectCreateForm";

describe("projectCreateForm", () => {
  it("requires name, slug, summary, purpose, and defaultLanguage", () => {
    expect(validateProjectCreateForm(initialProjectCreateFormValues)).toEqual({
      name: "프로젝트 이름을 입력해주세요.",
      slug: "프로젝트 식별자를 입력해주세요.",
      summary: "한 줄 설명을 입력해주세요.",
      purpose: "프로젝트 목적을 입력해주세요.",
    });
  });

  it("builds createProject payload with only API-supported fields", () => {
    const request = toCreateProjectRequest({
      defaultLanguage: "en",
      name: "  Contextory Web  ",
      purpose: "  프로젝트 맥락 관리  ",
      slug: " contextory-web ",
      summary: " AI 프로젝트 메모리 ",
    });

    expect(request).toEqual({
      defaultLanguage: "en",
      name: "Contextory Web",
      purpose: "프로젝트 맥락 관리",
      slug: "contextory-web",
      summary: "AI 프로젝트 메모리",
    });
    expect(request).not.toHaveProperty("features");
    expect(request).not.toHaveProperty("roles");
    expect(request).not.toHaveProperty("repository");
    expect(request).not.toHaveProperty("team");
  });

  it("omits blank optional text fields from the payload", () => {
    expect(toCreateProjectRequest({
      ...initialProjectCreateFormValues,
      defaultLanguage: "ko",
      name: "Demo",
      slug: "demo",
      summary: "   ",
      purpose: "",
    })).toEqual({
      defaultLanguage: "ko",
      name: "Demo",
      slug: "demo",
      summary: undefined,
      purpose: undefined,
    });
  });
});
