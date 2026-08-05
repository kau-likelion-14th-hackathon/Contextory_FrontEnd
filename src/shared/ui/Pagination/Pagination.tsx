import { Button } from "../Button";
import "./Pagination.css";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
};

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  ariaLabel = "Pagination",
  previousLabel = "Previous",
  nextLabel = "Next",
}: PaginationProps) {
  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label={ariaLabel}>
      <Button
        aria-label={previousLabel}
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        size="sm"
        variant="secondary"
      >
        {previousLabel}
      </Button>
      <div className="pagination__pages">
        {pages.map((page, index) => {
          const previousPage = pages[index - 1];
          const showGap = previousPage !== undefined && page - previousPage > 1;

          return (
            <span className="pagination__page-group" key={page}>
              {showGap ? <span className="pagination__ellipsis">…</span> : null}
              <button
                aria-current={page === currentPage ? "page" : undefined}
                className={
                  page === currentPage
                    ? "pagination__page pagination__page--active"
                    : "pagination__page"
                }
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page}
              </button>
            </span>
          );
        })}
      </div>
      <Button
        aria-label={nextLabel}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        size="sm"
        variant="secondary"
      >
        {nextLabel}
      </Button>
    </nav>
  );
}
