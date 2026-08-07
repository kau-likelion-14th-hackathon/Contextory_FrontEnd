import { Link, useParams } from "react-router-dom";
import { PageContainer } from "../../shared/layouts";
import { Badge, EmptyState } from "../../shared/ui";
import {
  getProjectMemoryDetail,
  type MemoryDetailRole,
  type MemoryFollowUpStatus,
  type ProjectMemoryDetail,
} from "./projectMemoryDetailMock";
import "./ProjectMemoryDetailScreen.css";

const roleClassNames: Record<MemoryDetailRole, string> = {
  프론트엔드: "project-memory-detail__role--frontend",
  기획: "project-memory-detail__role--planning",
  QA: "project-memory-detail__role--qa",
  백엔드: "project-memory-detail__role--backend",
  SRE: "project-memory-detail__role--sre",
};

const followUpVariants: Record<
  MemoryFollowUpStatus,
  "success" | "warning" | "neutral"
> = {
  완료: "success",
  "진행 중": "warning",
  대기: "neutral",
};

export function ProjectMemoryDetailScreen() {
  const { projectId = "", recordId } = useParams();
  const record = getProjectMemoryDetail(recordId);

  if (!record) {
    return <ProjectMemoryNotFound projectId={projectId} />;
  }

  return (
    <main className="project-memory-detail">
      <PageContainer size="full">
        <div className="project-memory-detail__content">
          <MemoryDetailHeader record={record} />
          <MemoryDetailIndex record={record} />

          <div className="project-memory-detail__grid">
            <DetailSection area="summary" title="1. 작업 요약">
              <p>{record.summary}</p>
            </DetailSection>

            <DetailSection area="purpose" title="2. 작업 목적">
              <p>{record.purpose}</p>
            </DetailSection>

            <DetailSection area="comparison" title="3. 변경 전 / 변경 후">
              <div className="project-memory-detail__comparison">
                <CodeComparison code={record.before} label="변경 전" tone="before" />
                <CodeComparison code={record.after} label="변경 후" tone="after" />
              </div>
            </DetailSection>

            <DetailSection area="features" title="4. 관련 기능">
              <div className="project-memory-detail__tags" aria-label="관련 기능">
                {record.featureTags.map((tag) => (
                  <Badge key={tag} variant="success">{tag}</Badge>
                ))}
              </div>
            </DetailSection>

            <DetailSection area="impact" title="5. 역할별 영향">
              <div className="project-memory-detail__roles" aria-label="영향받는 역할">
                {record.roles.map((role) => (
                  <Badge className={roleClassNames[role]} key={role} variant="neutral">
                    {role}
                  </Badge>
                ))}
              </div>
              <div className="project-memory-detail__impact-copy">
                <h3>영향 요약</h3>
                <p>{record.impactSummary}</p>
                <h3>기대 효과</h3>
                <ul>
                  {record.expectedEffects.map((effect) => <li key={effect}>{effect}</li>)}
                </ul>
              </div>
            </DetailSection>

            <DetailSection area="follow-ups" className="project-memory-detail__follow-ups" title="6. 후속 작업">
              <ul>
                {record.followUps.map((followUp) => (
                  <li key={followUp.id}>
                    <strong>{followUp.task}</strong>
                    <span><span className="project-memory-detail__meta-label">담당자</span>{followUp.assignee}</span>
                    <Badge variant={followUpVariants[followUp.status]}>{followUp.status}</Badge>
                  </li>
                ))}
              </ul>
            </DetailSection>

            <DetailSection area="evidence" title="7. GitHub 근거">
              <dl className="project-memory-detail__evidence">
                <div>
                  <dt>PR</dt>
                  <dd>#{record.evidence.pullRequest.number} {record.evidence.pullRequest.title}</dd>
                </div>
                <div>
                  <dt>커밋</dt>
                  <dd className="commit-hash">
                    {record.evidence.commit.hash} {record.evidence.commit.message}
                  </dd>
                </div>
                <div>
                  <dt>관련 이슈</dt>
                  <dd>#{record.evidence.issue.number} {record.evidence.issue.title}</dd>
                </div>
              </dl>
            </DetailSection>

            <DetailSection area="additional" title="8. 추가 정보">
              <dl className="project-memory-detail__additional-info">
                {record.additionalInfo.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd className={item.code ? "code-text" : undefined}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </DetailSection>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}

function MemoryDetailHeader({ record }: { record: ProjectMemoryDetail }) {
  return (
    <header className="project-memory-detail__header">
      <div className="project-memory-detail__header-copy">
        <div>
          <Badge className="project-memory-detail__type-badge" variant="info">
            {record.recordType}
          </Badge>
          <h1>{record.title}</h1>
          <Badge variant="success">{record.status}</Badge>
        </div>
        <p>
          승인자 {record.approver} · 승인일 {record.approvedAt} · 기록 {record.version}
        </p>
      </div>
      <a
        aria-label={`${record.title} GitHub 원본 보기 (새 탭)`}
        className="ui-button ui-button--secondary ui-button--sm"
        href={record.githubUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        GitHub에서 보기
      </a>
    </header>
  );
}

function MemoryDetailIndex({ record }: { record: ProjectMemoryDetail }) {
  return (
    <ul className="project-memory-detail__index" aria-label="프로젝트 기록 관련 정보">
      <li><strong aria-current="page">기록 상세</strong></li>
      <li><span>연관 PR {record.relatedCounts.pullRequests}</span></li>
      <li><span>연관 이슈 {record.relatedCounts.issues}</span></li>
      <li><span>댓글 {record.relatedCounts.comments}</span></li>
    </ul>
  );
}

function DetailSection({
  area,
  children,
  className = "",
  title,
}: {
  area: string;
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section
      className={["project-memory-detail__section", className].filter(Boolean).join(" ")}
      style={{ gridArea: area }}
    >
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function CodeComparison({
  code,
  label,
  tone,
}: {
  code: string;
  label: string;
  tone: "before" | "after";
}) {
  return (
    <section
      aria-label={label}
      className={`project-memory-detail__code-card project-memory-detail__code-card--${tone}`}
    >
      <h3>{label}</h3>
      <pre><code>{code}</code></pre>
    </section>
  );
}

function ProjectMemoryNotFound({ projectId }: { projectId: string }) {
  return (
    <main className="project-memory-detail project-memory-detail--not-found">
      <PageContainer size="full">
        <h1 className="project-memory-detail__visually-hidden">프로젝트 메모리 기록 상세</h1>
        <EmptyState
          description="삭제되었거나 존재하지 않는 프로젝트 기록입니다."
          details={
            <Link className="ui-button ui-button--primary ui-button--sm" to={`/projects/${projectId}/records`}>
              프로젝트 메모리로 돌아가기
            </Link>
          }
          title="프로젝트 기록을 찾을 수 없습니다"
        />
      </PageContainer>
    </main>
  );
}
