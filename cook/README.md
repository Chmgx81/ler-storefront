# Cook notes

This folder is the working record behind the storefront, kept because the
reasoning is often more useful than the code.

| File | What it holds |
|---|---|
| `BRIEF.md` | The original brief, constraints, calibration targets and scope extensions |
| `ROUNDS.md` | Round-by-round log: what changed, what was measured, what was reverted |
| `OWASP.md` | Coverage against the OWASP Top 10, plus what is deliberately out of scope |
| `SHOTS.md` | The screenshot matrix used to compare rounds |
| `a11y/` | axe-core reports for each audited view |

`stills/` and `refs/` are **not** in the repository: the stills are ~49 MB of
round-by-round screenshots, and `refs/` holds captures of third-party sites that
are not ours to redistribute. Both are ignored by `.gitignore`. If you want to
reproduce them, run the app and capture at 1440x900 and 390x844.

Everything in `BRIEF.md` about product photography, fonts and references maps to
the asset notes in [`../LICENSE`](../LICENSE).
