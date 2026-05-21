import type { ComponentChildren } from "preact";

interface Props {
  title: string;
  children: ComponentChildren;
}

export function Panel({ title, children }: Props) {
  return (
    <aside class="panel">
      <h2 class="panel__title">{title}</h2>
      {children}
    </aside>
  );
}
