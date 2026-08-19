import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const COLLAPSED_MAX_HEIGHT_PX = 230;

type PullRequestBodyMarkdownProps = {
  body?: string | null;
};

export function PullRequestBodyMarkdown({ body }: PullRequestBodyMarkdownProps) {
  const content = body?.trim();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [content]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || !content) {
      setOverflows(false);
      return;
    }

    const measure = () => {
      setOverflows(element.scrollHeight > COLLAPSED_MAX_HEIGHT_PX);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content]);

  if (!content) {
    return <p>PR 설명이 없습니다.</p>;
  }

  return (
    <div className="pull-request-review__markdown-wrap">
      <div
        className={[
          "pull-request-review__markdown",
          expanded ? null : "pull-request-review__markdown--collapsed",
        ].filter(Boolean).join(" ")}
        ref={contentRef}
      >
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a href={href} rel="noopener noreferrer" target="_blank">
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="pull-request-review__markdown-table">
                <table>{children}</table>
              </div>
            ),
          }}
          remarkPlugins={[remarkGfm]}
        >
          {content}
        </ReactMarkdown>
      </div>
      {overflows ? (
        <button
          className="pull-request-review__markdown-toggle"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}
