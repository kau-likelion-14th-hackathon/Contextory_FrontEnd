import { useState } from "react";
import { CreditPack, PlanCard } from "../billing/components";
import { PullRequestRow } from "../github/components";
import { MemoryItem } from "../memory/components";
import { KpiCard, ProjectCard } from "../project/components";
import { MemberRow } from "../team/components";
import {
  AuthLayout,
  ButtonGroup,
  PageContainer,
  ProjectLayout,
  ResponsiveGrid,
  SettingsLayout,
} from "../../shared/layouts";
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
  Pagination,
  RoleBadge,
  SearchInput,
  SuccessState,
  Tabs,
} from "../../shared/ui";
import "./UiShowcase.css";

export function UiShowcase() {
  const [activeTab, setActiveTab] = useState("overview");
  const [page, setPage] = useState(3);
  const [search, setSearch] = useState("analysis");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingConfirmOpen, setLoadingConfirmOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PageContainer size="full">
      <div className="ui-showcase">
        <header className="ui-showcase__header">
          <p className="eyebrow">Development</p>
          <h1>Contextory UI Components</h1>
          <p>
            공통 UI 컴포넌트와 반응형 레이아웃을 확인하기 위한 개발용 화면입니다.
          </p>
        </header>

        <section className="ui-showcase__section">
          <h2>Button</h2>
          <ButtonGroup>
            <Button>주요 작업</Button>
            <Button variant="secondary">보조 작업</Button>
            <Button variant="ghost">텍스트 작업</Button>
            <Button variant="danger">위험 작업</Button>
            <Button loading>처리 중</Button>
            <Button disabled>비활성</Button>
          </ButtonGroup>
          <ButtonGroup align="stretch">
            <Button size="sm">작게</Button>
            <Button size="md">기본</Button>
            <Button size="lg">크게</Button>
          </ButtonGroup>
          <Button fullWidth variant="secondary">
            전체 너비 버튼
          </Button>
        </section>

        <section className="ui-showcase__section">
          <h2>Fonts</h2>
          <div className="ui-showcase__font-grid">
            <div className="ui-showcase__font-sample">
              <p className="ui-showcase__font-label">Noto Sans KR</p>
              <p>팀의 작업 맥락을 기억하고 연결합니다.</p>
              <strong>Contextory Project Memory</strong>
            </div>
            <div className="ui-showcase__font-sample">
              <p className="ui-showcase__font-label">D2Coding</p>
              <pre className="diff-content">
                <code>{`const message = "안녕하세요";
src/features/auth/LoginPage.tsx
POST /auth/login
feature/auth-login
a1b2c3d
{ "errorCode": "INVALID_PASSWORD" }`}</code>
              </pre>
              <div className="ui-showcase__code-list">
                <span className="file-path">src/features/auth/LoginPage.tsx</span>
                <span className="api-path">POST /auth/login</span>
                <span className="branch-name">feature/auth-login</span>
                <span className="commit-hash">a1b2c3d</span>
              </div>
            </div>
          </div>
        </section>

        <section className="ui-showcase__section">
          <h2>Inputs</h2>
          <ResponsiveGrid desktopColumns={3}>
            <FormField label="Email" placeholder="you@contextory.dev" type="email" />
            <FormField
              errorMessage="비밀번호는 8자 이상이어야 합니다."
              label="Password"
              placeholder="Password"
              type="password"
            />
            <FormField
              disabled
              helperText="초대 링크 복구 후 자동 입력될 수 있습니다."
              label="Project"
              value="Contextory MVP"
            />
            <FormField
              helperText="읽기 전용 필드도 포커스와 설명 연결을 유지합니다."
              label="Repository"
              readOnly
              value="contextory/frontend"
            />
          </ResponsiveGrid>
          <SearchInput
            aria-label="Search records"
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search project memory"
            value={search}
          />
          <Input aria-label="Focused input example" placeholder="Standalone input" />
        </section>

        <section className="ui-showcase__section">
          <h2>Badge, Tabs, Pagination</h2>
          <ButtonGroup>
            <Badge>중립</Badge>
            <Badge variant="success">승인됨</Badge>
            <Badge variant="warning">검토 필요</Badge>
            <Badge variant="danger">실패</Badge>
            <Badge variant="info">정보</Badge>
            <RoleBadge role="Frontend reviewer" variant="info" />
            <RoleBadge role="Billing owner" variant="warning" />
            <Badge>매우 긴 배지 텍스트도 영역 안에서 안전하게 줄바꿈됩니다</Badge>
          </ButtonGroup>
          <Tabs
            activeTab={activeTab}
            ariaLabel="Showcase tabs"
            onChange={setActiveTab}
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "github", label: "GitHub Work" },
              { id: "memory", label: "Project Memory" },
              { id: "billing", label: "Billing", disabled: true },
              { id: "settings", label: "Settings" },
            ]}
          />
          <Pagination currentPage={page} onPageChange={setPage} totalPages={12} />
        </section>

        <section className="ui-showcase__section">
          <h2>Feedback State</h2>
          <ResponsiveGrid desktopColumns={4} tabletColumns={2}>
            <LoadingState title="Loading records" description="프로젝트 기록을 불러오는 중입니다." />
            <EmptyState title="No records" description="승인된 기록이 아직 없습니다." />
            <ErrorState
              title="Sync failed"
              description="GitHub 동기화 상태를 확인해주세요."
              action={{ label: "다시 시도", onClick: () => undefined }}
            />
            <SuccessState
              title="Saved"
              description="변경사항이 저장되었습니다."
              action={{ label: "프로젝트로 이동", onClick: () => undefined }}
              secondaryAction={{ label: "닫기", onClick: () => undefined }}
            />
          </ResponsiveGrid>
        </section>

        <section className="ui-showcase__section">
          <h2>Modal</h2>
          <ButtonGroup>
            <Button onClick={() => setModalOpen(true)} variant="secondary">
              Open modal
            </Button>
            <Button onClick={() => setConfirmOpen(true)} variant="danger">
              Open confirm
            </Button>
            <Button onClick={() => setLoadingConfirmOpen(true)} variant="secondary">
              Loading confirm
            </Button>
          </ButtonGroup>
          <Modal
            description="ESC, 배경 클릭, 닫기 버튼으로 닫을 수 있습니다."
            onClose={() => setModalOpen(false)}
            open={modalOpen}
            title="Review analysis"
          >
            <p>
              실제 분석 검토 기능은 API 명세 확정 후 연결합니다. 이 모달은
              레이아웃과 접근성 확인용입니다.
            </p>
            <div className="ui-showcase__modal-scroll">
              {Array.from({ length: 8 }, (_, index) => (
                <p key={index}>
                  긴 분석 결과 문단 {index + 1}: 코드 diff, 역할별 영향, 후속 작업 후보가 길어져도
                  모달 내부에서 스크롤되어야 합니다.
                </p>
              ))}
            </div>
          </Modal>
          <ConfirmDialog
            confirmLabel="삭제"
            cancelLabel="취소"
            description="위험 작업은 danger 버튼을 사용합니다."
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => setConfirmOpen(false)}
            open={confirmOpen}
            title="초안을 삭제할까요?"
            variant="danger"
          />
          <ConfirmDialog
            cancelText="닫기"
            confirmText="저장 중"
            description="로딩 중에는 닫기와 확인 버튼이 비활성화됩니다."
            loading
            onCancel={() => setLoadingConfirmOpen(false)}
            onConfirm={() => undefined}
            open={loadingConfirmOpen}
            title="저장 요청 처리 중"
          />
        </section>

        <section className="ui-showcase__section">
          <h2>Domain Components</h2>
          <ResponsiveGrid desktopColumns={3}>
            <ProjectCard
              description="팀의 작업 맥락을 프로젝트 메모리로 연결합니다."
              memberCount={6}
              name="Contextory MVP"
              repositoryLabel="contextory/frontend"
              status="Active"
              action={<Button size="sm">Open</Button>}
            />
            <KpiCard label="Pending reviews" value={8} description="검토가 필요한 분석 초안" trend="+2 this week" />
            <PlanCard
              description="초기 팀 검증용 플랜"
              features={[{ label: "1 repository" }, { label: "Manual sync" }, { label: "Team review" }]}
              highlighted
              name="Team"
              price="$29"
              actionLabel="Select plan"
              onAction={() => undefined}
            />
          </ResponsiveGrid>
          <div className="ui-showcase__rows">
            <PullRequestRow
              author="yuhyun"
              filesChanged={12}
              number={42}
              status="Review needed"
              title="Add project memory approval workflow and reviewer notes with a deliberately long title that wraps on narrow viewports"
              updatedAt="2h ago"
              action={<Button size="sm" variant="secondary">Review</Button>}
            />
            <MemoryItem
              affectedRoles={["FE", "BE", "QA"]}
              approvedAt="Today"
              summary="승인 흐름과 후속 작업 상태 표현을 프로젝트 홈에 반영해야 합니다."
              title="Approval workflow changed"
              type="Decision"
            />
            <MemberRow
              email="member@contextory.dev"
              name="Project Member"
              role="member"
              status="Invited"
              action={<Button size="sm" variant="ghost">Manage</Button>}
            />
            <CreditPack
              credits={1200}
              description="AI 분석 요청에 사용할 수 있는 추가 크레딧"
              price="$12"
              actionLabel="Buy credits"
              onAction={() => undefined}
            />
          </div>
        </section>

        <section className="ui-showcase__section">
          <h2>Layouts</h2>
          <div className="ui-showcase__layout-preview">
            <AuthLayout
              title="Contextory"
              description="브랜드 영역과 폼 영역의 반응형 인증 레이아웃"
            >
              <FormField label="Email" placeholder="you@contextory.dev" />
            </AuthLayout>
          </div>
          <div className="ui-showcase__layout-preview">
            <Button onClick={() => setSidebarOpen(true)} size="sm" variant="secondary">
              사이드바 열기
            </Button>
            <ProjectLayout
              actions={<Button size="sm" variant="secondary">설정</Button>}
              onSidebarClose={() => setSidebarOpen(false)}
              onSidebarOpen={() => setSidebarOpen(true)}
              projectName="Contextory MVP"
              repositoryLabel="Repository not connected"
              sidebarOpen={sidebarOpen}
              sidebarItems={[
                { label: "Home", active: true },
                { label: "GitHub Work" },
                { label: "Project Memory" },
              ]}
            >
              <PageContainer>
                <EmptyState title="Project layout content" />
              </PageContainer>
            </ProjectLayout>
          </div>
          <SettingsLayout
            description="설정 내비게이션과 콘텐츠를 분리합니다."
            navItems={[
              { label: "Project", active: true },
              { label: "Members" },
              { label: "Billing" },
            ]}
            title="Settings"
          >
            <EmptyState title="Settings content" />
          </SettingsLayout>
        </section>
      </div>
    </PageContainer>
  );
}
