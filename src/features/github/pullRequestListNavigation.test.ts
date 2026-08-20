import { describe, expect, it } from "vitest";
import {
  appendPullRequestListContext,
  buildGithubListReturnTo,
  buildPullRequestDetailPath,
  buildPullRequestListSearch,
  getPullRequestListContext,
  getPullRequestPaginationItems,
  isCanonicalPullRequestListSearch,
  parsePullRequestListQuery,
} from "./pullRequestListNavigation";

describe("parsePullRequestListQuery", () => {
  it("defaults to OPEN / 1 when query is missing", () => {
    expect(parsePullRequestListQuery(new URLSearchParams())).toEqual({
      state: "OPEN",
      page: 1,
    });
  });

  it("parses CLOSED / 5", () => {
    expect(parsePullRequestListQuery("state=CLOSED&page=5")).toEqual({
      state: "CLOSED",
      page: 5,
    });
  });

  it("parses ALL / 2", () => {
    expect(parsePullRequestListQuery("?state=ALL&page=2")).toEqual({
      state: "ALL",
      page: 2,
    });
  });

  it("falls back invalid state to OPEN", () => {
    expect(parsePullRequestListQuery("state=INVALID&page=3").state).toBe("OPEN");
    expect(parsePullRequestListQuery("state=open&page=3").state).toBe("OPEN");
  });

  it.each(["0", "-1", "abc", "2.5", ""])("falls back invalid page %j to 1", (page) => {
    expect(parsePullRequestListQuery(`state=CLOSED&page=${page}`)).toEqual({
      state: "CLOSED",
      page: 1,
    });
  });

  it("detects non-canonical search params", () => {
    expect(isCanonicalPullRequestListSearch("state=INVALID&page=abc")).toBe(false);
    expect(isCanonicalPullRequestListSearch("state=OPEN&page=1")).toBe(true);
    expect(isCanonicalPullRequestListSearch(new URLSearchParams())).toBe(false);
  });
});

describe("getPullRequestPaginationItems", () => {
  it("shows current and next on first page when hasNext", () => {
    expect(getPullRequestPaginationItems({ currentPage: 1, hasNext: true }))
      .toEqual([1, 2]);
  });

  it("shows neighbors around current page", () => {
    expect(getPullRequestPaginationItems({ currentPage: 2, hasNext: true }))
      .toEqual([1, 2, 3]);
  });

  it("inserts ellipsis when far from first page", () => {
    expect(getPullRequestPaginationItems({ currentPage: 5, hasNext: true }))
      .toEqual([1, "ellipsis", 4, 5, 6]);
  });

  it("does not invent next page when hasNext is false", () => {
    expect(getPullRequestPaginationItems({ currentPage: 5, hasNext: false }))
      .toEqual([1, "ellipsis", 4, 5]);
  });

  it("shows only page 1 when first page is last", () => {
    expect(getPullRequestPaginationItems({ currentPage: 1, hasNext: false }))
      .toEqual([1]);
  });
});

describe("list context helpers", () => {
  it("builds detail and return paths with context", () => {
    expect(buildPullRequestDetailPath(39, 123, { state: "CLOSED", page: 5 }))
      .toBe("/projects/39/github/pulls/123?state=CLOSED&page=5");
    expect(buildGithubListReturnTo(39, "state=CLOSED&page=5"))
      .toBe("/projects/39/github?state=CLOSED&page=5");
    expect(buildGithubListReturnTo(39, new URLSearchParams()))
      .toBe("/projects/39/github");
  });

  it("appends canonical context to analysis paths", () => {
    expect(appendPullRequestListContext(
      "/projects/39/analyses/88",
      "state=CLOSED&page=5",
    )).toBe("/projects/39/analyses/88?state=CLOSED&page=5");

    expect(appendPullRequestListContext(
      "/projects/39/analyses/88",
      "state=INVALID&page=abc",
    )).toBe("/projects/39/analyses/88?state=OPEN&page=1");

    expect(appendPullRequestListContext(
      "/projects/39/analyses/88",
      new URLSearchParams(),
    )).toBe("/projects/39/analyses/88");
  });

  it("returns null context when state/page are absent", () => {
    expect(getPullRequestListContext(new URLSearchParams())).toBeNull();
    expect(getPullRequestListContext("foo=1")).toBeNull();
    expect(getPullRequestListContext("state=CLOSED&page=5")).toEqual({
      state: "CLOSED",
      page: 5,
    });
  });

  it("builds search params", () => {
    expect(buildPullRequestListSearch({ state: "ALL", page: 2 }).toString())
      .toBe("state=ALL&page=2");
  });
});
