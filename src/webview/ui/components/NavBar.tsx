import { classigo } from "classigo";
import { Button } from "./Button";

interface Props {
  crumbs: string[];
  canGoBack: boolean;
  canGoRoot: boolean;
  onBack: () => void;
  onRoot: () => void;
}

export function NavBar({ crumbs, canGoBack, canGoRoot, onBack, onRoot }: Props) {
  return (
    <nav class="navbar" aria-label="Webview navigation">
      <Button size="tiny" onClick={onBack} disabled={!canGoBack} ariaLabel="Back">
        ← Back
      </Button>
      {canGoRoot && (
        <Button size="tiny" onClick={onRoot} ariaLabel="Back to root">
          ⤴ Root
        </Button>
      )}
      <ol class="navbar__crumbs">
        {crumbs.map((label, i) => (
          <li
            class={classigo("navbar__crumb", {
              "navbar__crumb--current": i === crumbs.length - 1,
            })}
            key={i}
          >
            {label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
