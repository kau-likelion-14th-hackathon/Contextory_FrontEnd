import "./PageContainer.css";

export type PageContainerProps = {
  children: React.ReactNode;
  size?: "md" | "lg" | "full";
};

export function PageContainer({ children, size = "lg" }: PageContainerProps) {
  return <div className={`page-container page-container--${size}`}>{children}</div>;
}
