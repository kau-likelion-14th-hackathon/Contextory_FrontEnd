import "./ButtonGroup.css";

export type ButtonGroupProps = {
  children: React.ReactNode;
  align?: "start" | "end" | "stretch";
  stackOnMobile?: boolean;
};

export function ButtonGroup({
  children,
  align = "start",
  stackOnMobile = true,
}: ButtonGroupProps) {
  return (
    <div
      className={[
        "button-group",
        `button-group--${align}`,
        stackOnMobile ? "button-group--stack-mobile" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
