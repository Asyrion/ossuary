---
name: ship
description: Ship finished work on Ossuary to GitHub Pages - check it, open a PR, wait for CI, rebase-merge, bring the working branch back in step with main, and confirm the Pages deploy. Use when the owner asks to open a PR and merge it (or "ship it", "make it live"). Never start it on your own; the owner decides when to ship.
---

# Ship: from a finished branch to a live play-test build

The owner asks for this; you don't decide to ship by yourself. `main` deploys to GitHub Pages through the
"Test and deploy to GitHub Pages" workflow. CI is lean on Actions minutes (the repo is private and its quota ran out
once, 2026-10-22): a PR and a push to `main` run one job, `build` (format, lint, unit tests, build, about 4 minutes), and
`deploy` on `main` waits for it. The browser suite does **not** run on CI by itself: you run it locally before the PR
(step 1), and that run is what vouches for the change. PRs are **rebase-merged**, except a branch that holds a merge
commit of another branch: rebasing it would replay that branch's commits and bring back the conflicts the merge
resolved, so it is merged with a merge commit. The repo has no required checks on `main`, so GitHub's auto-merge is
not available: merge by hand once `build` is green.

In a cloud session, GitHub goes through the `mcp__github__*` tools (no `gh`); locally, `gh` does the same.

## 1. Check before anything leaves the machine

- Nothing uncommitted that belongs in the change; no scratch files (`*.tmp.*`) or screenshots staged.
- `npx tsc --noEmit -p .`, `npx vitest run`, the browser suite (`npx playwright test`; in a cloud session set
  `PW_CHROMIUM` to the Chromium under `/opt/pw-browsers`, e.g.
  `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`), and `npm run build`. All must
  pass. If one fails, fix it first; never skip or quarantine a test.
- Run the **rules-reviewer** subagent on `origin/main...HEAD` (see CLAUDE.md, "Agents and skills"), telling it the
  typecheck and unit tests just ran (`--no-tests`), and fix its blocking findings. If the change touched how rooms
  look and no inspection covered it yet, run the **room-inspector** (a routine check on what changed).
- GitHub milestones (CLAUDE.md, Working agreements): `npm run milestone -- list` matches the roadmap. Every milestone the
  change adds to the GDD's roadmap is there, and every one it marks built is closed (`npm run milestone -- open` or
  `close`).
- `git fetch origin main -q` and check that the branch starts from `origin/main` (`git merge-base --is-ancestor
  origin/main HEAD`). If not, rebase the branch's own commits onto it.

## 2. Push and open the PR

- `git push -u origin <branch>` (retry up to four times with backoff only on network errors). GitHub may print a
  rule notice even when the push goes through; check `git log -1 origin/<branch>`.
- Open a PR into `main`. The repo has no PR template. Body: why (the play-test finding or the plan step), what
  changed (short sections), how it was tested (unit and browser counts, the build). End the body with:

  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  <the session link from the attribution reminder>
  ```
  No model names or ids anywhere in the PR.
- Tell the owner the PR link in one line.

## 3. Wait for CI, then merge

- Subscribe to the PR's activity and schedule a check-in about 5 minutes out (`send_later`), so the merge happens
  even if the webhook is late. Don't poll with `sleep`.
- When `build` is green: merge (see above) with `expectedHeadSha` set to the PR's head, so
  nothing unseen gets merged.
- If a job is red: read the job log, reproduce the failure locally, fix the root cause, push, and wait again.
  A test that fails by luck is a test bug to fix (as the bone altar test was), not a reason to re-run.
- Unsubscribe and delete the check-in once merged.

## 4. Bring the branch back in step

```
git fetch origin main -q
git cherry -v origin/main HEAD          # every line must start with "-": all commits landed on main
git checkout -B <branch> origin/main
git push --force-with-lease -u origin <branch>
```

## 5. Confirm the deploy

- The push to `main` starts a new "Test and deploy to GitHub Pages" run. Check it (`actions_list`,
  `list_workflow_runs` on `main`) or schedule a check-in about 5 minutes out; the deploy needs only `build`, and a red
  `build` on `main` after a green PR points at the merge or at Actions itself (quota, billing: the job never starts).
- If it passed: tell the owner the build is live (and to reload the page).
- If it failed: the merge still stands. Read the log; if a test failed, reproduce and fix it in a small follow-up
  PR (this skill again). Re-running the deploy is fine to get the build live while the fix goes through, but it
  never replaces the fix.
