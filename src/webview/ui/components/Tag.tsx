import { classigo } from "classigo";
import type { ComponentChildren } from "preact";
import type { SessionStatus } from "../types";

type TagVariant = "status" | "kind" | "client" | "time" | "updated";

interface Props {
  variant: TagVariant;
  status?: SessionStatus;
  children: ComponentChildren;
}

export function Tag({ variant, status, children }: Props) {
  return (
    <span
      class={classigo(
        "tag",
        `tag--${variant}`,
        variant === "status" && status && `tag--${status}`,
      )}
    >
      {children}
    </span>
  );
}
