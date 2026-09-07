// scraper/progress.ts
// A thin tqdm-like wrapper around cli-progress, used by main.ts and
// rescrape.ts. Mirrors the two tqdm behaviors the Python scraper relied
// on: a persistent outer bar (`leave=True`, the default) and a nested
// inner bar that disappears once its loop finishes (`leave=False`).

import cliProgress from "cli-progress";

const FORMAT = "  {label} [{bar}] {value}/{total} | ETA: {eta_formatted} | {extra}";

export function createMultiBar(): cliProgress.MultiBar {
  return new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: FORMAT,
    },
    cliProgress.Presets.shades_classic,
  );
}

export class ProgressBar {
  private multibar: cliProgress.MultiBar;
  private bar: cliProgress.SingleBar;

  constructor(multibar: cliProgress.MultiBar, label: string, total: number) {
    this.multibar = multibar;
    this.bar = multibar.create(total, 0, { label, extra: "" });
  }

  tick(extra = ""): void {
    this.bar.increment(1, { extra });
  }

  /** Removes this bar's line entirely — the `leave=False` equivalent. */
  remove(): void {
    this.multibar.remove(this.bar);
  }

  /** Keeps this bar's final line on screen — the `leave=True` (default) equivalent. */
  stop(): void {
    this.bar.stop();
  }
}
