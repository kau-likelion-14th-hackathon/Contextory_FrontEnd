import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageContainer } from "../../shared/layouts";
import { Badge, EmptyState, Pagination, SearchInput } from "../../shared/ui";
import {
  memoryRecordTypes,
  memoryRoles,
  memorySortOptions,
  projectMemoryRecordsMock,
  type MemoryRecordTypeFilter,
  type MemoryRole,
  type MemoryRoleFilter,
  type MemorySortOption,
  type ProjectMemoryRecord,
} from "./projectMemoryMock";
import "./ProjectMemoryScreen.css";

const DEFAULT_PAGE_SIZE = 10;
const pageSizeOptions = [5, 10, 20] as const;

const roleClassNames: Record<MemoryRole, string> = {
  FE: "project-memory__role--fe",
  BE: "project-memory__role--be",
  PM: "project-memory__role--pm",
  QA: "project-memory__role--qa",
  SRE: "project-memory__role--sre",
  CS: "project-memory__role--cs",
};

function matchesSearch(record: ProjectMemoryRecord, normalizedSearch: string) {
  if (!normalizedSearch) return true;

  return [
    record.title,
    record.summary,
    record.type,
    ...record.roles,
    ...record.keywords,
  ].some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedSearch));
}

function getFollowUpLabel(record: ProjectMemoryRecord) {
  return record.followUp.completed === record.followUp.total
    ? "완료"
    : `${record.followUp.completed} / ${record.followUp.total}`;
}

export function ProjectMemoryScreen() {
  const { projectId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<MemoryRecordTypeFilter>("전체");
  const [roleFilter, setRoleFilter] = useState<MemoryRoleFilter>("모든 역할");
  const [sortOption, setSortOption] = useState<MemorySortOption>("최신순");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const searchTerm = searchParams.get("q") ?? "";
  const isProjectEmpty = searchParams.get("state") === "empty";

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("ko-KR");

    return projectMemoryRecordsMock
      .filter((record) => matchesSearch(record, normalizedSearch))
      .filter((record) => typeFilter === "전체" || record.type === typeFilter)
      .filter((record) => roleFilter === "모든 역할" || record.roles.includes(roleFilter))
      .sort((left, right) => {
        const direction = sortOption === "최신순" ? -1 : 1;
        return left.approvedAtValue.localeCompare(right.approvedAtValue) * direction;
      });
  }, [roleFilter, searchTerm, sortOption, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const isSearchEmpty = !isProjectEmpty && filteredRecords.length === 0;

  const updateSearchTerm = (value: string) => {
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set("q", value);
    else nextParams.delete("q");
    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("q");
    setSearchParams(nextParams, { replace: true });
    setTypeFilter("전체");
    setRoleFilter("모든 역할");
    setSortOption("최신순");
    setPageSize(DEFAULT_PAGE_SIZE);
    setCurrentPage(1);
  };

  return (
    <main className="project-memory">
      <PageContainer size="full">
        <div className="project-memory__content">
          <header className="project-memory__header">
            <div>
              <h1>프로젝트 메모리</h1>
              <p>승인된 프로젝트 기록을 검색하고 팀의 공식 지식으로 활용하세요.</p>
            </div>
            <Badge className="project-memory__approved-pill" variant="success">
              승인된 기록만 표시
            </Badge>
          </header>

          <section className="project-memory__type-filters" aria-label="기록 유형 필터">
            {memoryRecordTypes.map((type) => (
              <button
                aria-pressed={typeFilter === type}
                key={type}
                onClick={() => {
                  setTypeFilter(type);
                  setCurrentPage(1);
                }}
                type="button"
              >
                {type}
              </button>
            ))}
          </section>

          <section className="project-memory__filters" aria-label="프로젝트 기록 검색 및 필터">
            <label className="project-memory__visually-hidden" htmlFor="project-memory-search">
              프로젝트 기록 검색
            </label>
            <SearchInput
              id="project-memory-search"
              onChange={(event) => updateSearchTerm(event.target.value)}
              onClear={() => updateSearchTerm("")}
              placeholder="기록 제목, 내용, 키워드 검색..."
              value={searchTerm}
            />
            <label className="project-memory__visually-hidden" htmlFor="project-memory-role">
              영향 역할 필터
            </label>
            <select
              id="project-memory-role"
              onChange={(event) => {
                setRoleFilter(event.target.value as MemoryRoleFilter);
                setCurrentPage(1);
              }}
              value={roleFilter}
            >
              {memoryRoles.map((role) => <option key={role}>{role}</option>)}
            </select>
            <label className="project-memory__visually-hidden" htmlFor="project-memory-sort">
              프로젝트 기록 정렬
            </label>
            <select
              id="project-memory-sort"
              onChange={(event) => {
                setSortOption(event.target.value as MemorySortOption);
                setCurrentPage(1);
              }}
              value={sortOption}
            >
              {memorySortOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </section>

          <span aria-live="polite" className="project-memory__visually-hidden">
            {isProjectEmpty
              ? "승인된 프로젝트 기록 없음"
              : `${filteredRecords.length}개의 프로젝트 기록 검색됨`}
          </span>

          {isProjectEmpty ? (
            <MemoryEmptyState projectId={projectId} />
          ) : isSearchEmpty ? (
            <MemorySearchEmptyState onReset={resetFilters} searchTerm={searchTerm.trim()} />
          ) : (
            <>
              <section className="project-memory__list" aria-label="승인된 프로젝트 기록 목록">
                {pageRecords.map((record) => (
                  <MemoryRecordItem key={record.id} projectId={projectId} record={record} />
                ))}
              </section>
              <footer className="project-memory__pagination">
                <p>총 {filteredRecords.length}개 기록</p>
                <div className="project-memory__pagination-controls">
                  <label htmlFor="project-memory-page-size">페이지당 기록 수</label>
                  <select
                    id="project-memory-page-size"
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    value={pageSize}
                  >
                    {pageSizeOptions.map((size) => (
                      <option key={size} value={size}>{size}개씩 보기</option>
                    ))}
                  </select>
                  <Pagination
                    ariaLabel="프로젝트 메모리 페이지"
                    currentPage={currentPage}
                    nextLabel="다음 페이지"
                    onPageChange={setCurrentPage}
                    previousLabel="이전 페이지"
                    totalPages={totalPages}
                  />
                </div>
              </footer>
            </>
          )}
        </div>
      </PageContainer>
    </main>
  );
}

function MemoryRecordItem({
  projectId,
  record,
}: {
  projectId: string;
  record: ProjectMemoryRecord;
}) {
  return (
    <Link
      aria-label={`${record.title} 상세 보기`}
      className="project-memory__record"
      to={`/projects/${projectId}/records/${record.id}`}
    >
      <div className="project-memory__type-block">
        <strong>{record.type}</strong>
      </div>
      <div className="project-memory__record-copy">
        <h2>{record.title}</h2>
        <p>{record.summary}</p>
        <div className="project-memory__roles" aria-label={`영향 역할: ${record.roles.join(", ")}`}>
          {record.roles.map((role) => (
            <Badge className={roleClassNames[role]} key={role} variant="neutral">
              {role}
            </Badge>
          ))}
        </div>
      </div>
      <dl className="project-memory__record-meta">
        <div>
          <dt>승인일</dt>
          <dd>{record.approvedAt}</dd>
        </div>
        <div>
          <dt>연결 PR</dt>
          <dd>#{record.pullRequestNumber}</dd>
        </div>
        <div>
          <dt>후속 작업</dt>
          <dd>{getFollowUpLabel(record)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function MemoryEmptyState({ projectId }: { projectId: string }) {
  return (
    <section className="project-memory__state" aria-label="프로젝트 기록 없음">
      <EmptyState
        description="PR을 분석하고 사람이 승인하면 팀의 공식 프로젝트 메모리로 쌓입니다."
        details={
          <Link className="ui-button ui-button--primary ui-button--sm" to={`/projects/${projectId}/github`}>
            GitHub 작업으로 이동
          </Link>
        }
        icon={<span aria-hidden="true">○</span>}
        title="아직 승인된 프로젝트 기록이 없어요"
      />
    </section>
  );
}

function MemorySearchEmptyState({
  onReset,
  searchTerm,
}: {
  onReset: () => void;
  searchTerm: string;
}) {
  const condition = searchTerm ? `“${searchTerm}”와 일치하는` : "선택한 조건과 일치하는";

  return (
    <section className="project-memory__state" aria-label="프로젝트 기록 검색 결과 없음">
      <EmptyState
        action={{ label: "검색 조건 초기화", onClick: onReset }}
        description={`${condition} 승인된 프로젝트 기록이 없습니다. 다른 키워드나 역할 필터를 사용해보세요.`}
        icon={<span aria-hidden="true">○</span>}
        title="검색 결과가 없어요"
      />
    </section>
  );
}
