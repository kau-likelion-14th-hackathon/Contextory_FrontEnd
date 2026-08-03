import "./ResponsiveGrid.css";

export type ResponsiveGridProps = {
  children: React.ReactNode;
  desktopColumns?: 1 | 2 | 3 | 4;
  tabletColumns?: 1 | 2;
};

export function ResponsiveGrid({
  children,
  desktopColumns = 3,
  tabletColumns = 2,
}: ResponsiveGridProps) {
  return (
    <div
      className="responsive-grid"
      style={
        {
          "--grid-desktop-columns": desktopColumns,
          "--grid-tablet-columns": tabletColumns,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
