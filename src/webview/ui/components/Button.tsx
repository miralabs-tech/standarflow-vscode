import { classigo } from "classigo";
import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
  onClick: () => void;
  variant?: "default" | "primary";
  size?: "normal" | "tiny";
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}

export function Button({
  children,
  onClick,
  variant = "default",
  size = "normal",
  disabled,
  title,
  ariaLabel,
}: Props) {
  return (
    <button
      type="button"
      class={classigo("btn", {
        "btn--primary": variant === "primary",
        "btn--tiny": size === "tiny",
      })}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
