import type { PullRequestState } from "./pullRequestApi";

export const PULL_REQUEST_LIST_STATES = ["OPEN", "CLOSED", "ALL"] as const;

export type PullRequestListQuery = {
  state: PullRequestState;
  page: number;
};

export type PullRequestPaginationItem = number | "ellipsis";

const DEFAULT_LIST_QUERY: PullRequestListQuery = {
  state: "OPEN",
  page: 1,
};

function isPullRequestState(value: string | null): value is PullRequestState {
  return value === "OPEN" || value === "CLOSED" || value === "ALL";
}

/** 양의 정수 문자열만 유효. 0, 음수, 소수, 비숫자는 거부. */
export function parsePullRequestListPage(value: string | null): number {
  if (!value) return DEFAULT_LIST_QUERY.page;
  if (!/^[1-9]\d*$/.test(value)) return DEFAULT_LIST_QUERY.page;
  return Number(value);
}

export function parsePullRequestListState(value: string | null): PullRequestState {
  return isPullRequestState(value) ? value : DEFAULT_LIST_QUERY.state;
}

export function parsePullRequestListQuery(
  searchParams: URLSearchParams | string,
): PullRequestListQuery {
  const params = typeof searchParams === "string"
    ? new URLSearchParams(searchParams.startsWith("?") ? searchParams.slice(1) : searchParams)
    : searchParams;

  return {
    state: parsePullRequestListState(params.get("state")),
    page: parsePullRequestListPage(params.get("page")),
  };
}

export function buildPullRequestListSearch({
  state,
  page,
}: PullRequestListQuery): URLSearchParams {
  return new URLSearchParams({
    state,
    page: String(Math.max(1, page)),
  });
}

export function isCanonicalPullRequestListSearch(
  searchParams: URLSearchParams | string,
): boolean {
  const params = typeof searchParams === "string"
    ? new URLSearchParams(searchParams.startsWith("?") ? searchParams.slice(1) : searchParams)
    : searchParams;
  const parsed = parsePullRequestListQuery(params);
  return params.get("state") === parsed.state
    && params.get("page") === String(parsed.page);
}

/**
 * 목록 navigation context.
 * state/page query가 전혀 없으면 null.
 * 있으면 안전하게 canonicalize한 값을 반환한다.
 */
export function getPullRequestListContext(
  searchParams: URLSearchParams | string,
): PullRequestListQuery | null {
  const params = typeof searchParams === "string"
    ? new URLSearchParams(searchParams.startsWith("?") ? searchParams.slice(1) : searchParams)
    : searchParams;

  if (!params.has("state") && !params.has("page")) return null;
  return parsePullRequestListQuery(params);
}

export function buildGithubListPath(
  projectId: string | number,
  context?: PullRequestListQuery | null,
): string {
  const base = `/projects/${projectId}/github`;
  if (!context) return base;
  return `${base}?${buildPullRequestListSearch(context)}`;
}

export function buildGithubListReturnTo(
  projectId: string | number,
  searchParams: URLSearchParams | string,
): string {
  return buildGithubListPath(projectId, getPullRequestListContext(searchParams));
}

export function appendPullRequestListContext(
  path: string,
  searchParams: URLSearchParams | string,
): string {
  const context = getPullRequestListContext(searchParams);
  if (!context) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${buildPullRequestListSearch(context)}`;
}

export function buildPullRequestDetailPath(
  projectId: string | number,
  prNumber: string | number,
  context: PullRequestListQuery,
): string {
  return `/projects/${projectId}/github/pulls/${prNumber}?${buildPullRequestListSearch(context)}`;
}

/**
 * totalPages 없이 확실히 알 수 있는 페이지만 노출한다.
 * - 1페이지 항상
 * - 현재 페이지
 * - current-1 (존재 시)
 * - hasNext면 current+1
 * - 1과 주변 사이 간격이 있으면 ellipsis
 */
export function getPullRequestPaginationItems({
  currentPage,
  hasNext,
}: {
  currentPage: number;
  hasNext: boolean;
}): PullRequestPaginationItem[] {
  const page = Math.max(1, currentPage);
  const pages = new Set<number>([1, page]);

  if (page - 1 >= 1) pages.add(page - 1);
  if (hasNext) pages.add(page + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: PullRequestPaginationItem[] = [];

  for (const nextPage of sorted) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && nextPage - previous > 1) {
      items.push("ellipsis");
    }
    items.push(nextPage);
  }

  return items;
}
