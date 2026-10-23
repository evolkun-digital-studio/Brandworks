# Build diagnosis log

## 2026-10-22

- Contract: `npm run build` should complete a production Next.js build for this workspace without source, type, or configuration errors.
- Environment: Windows/PowerShell, Node v24.3.0, npm 11.4.2, package manifest requests Next.js `^16.4.0` and TypeScript `~6.0.2`.
- Worktree: already contains extensive user changes; preserve them and limit edits to the demonstrated build failure.
- Next step: reproduce with the repository's `build` script and record the first actionable failure.
- Reproduction: `npm.cmd run build` completed with exit code 0.
- Decisive output: Next.js 16.4.0 compiled successfully, TypeScript finished, page data was collected, and 61/61 static pages were generated.
- Verdict: no build failure is currently reproducible, so there is no supported root cause or production-code fix to apply.

## Follow-up: user-reported wrapper error

- New symptom supplied: `Error evaluating Node.js code`.
- This is a framework wrapper rather than the nested exception; rerun the production build and capture the complete causal chain.
- Production reproduction: a second `npm.cmd run build` completed with exit code 0.
- Dev-server evidence: `.next/dev/logs/next-development.log` identifies Tailwind/PostCSS `CssSyntaxError` in `src/admin/styles/{base,components,editor,pages,shell}.css`; the evaluated input began with unresolved `<<<<<<< HEAD` text.
- Current-source comparison: all five stylesheets now begin with valid `@reference "../../index.css";` and contain no conflict markers.
- Hypothesis: PID 26252 is a stale Next dev process retaining the earlier failed module graph. Prediction: restarting it will compile the current CSS and the affected admin route will stop returning the evaluation error. Falsifier: the same nested CSS exception recurs after restart.
- Experiment: stopped stale PID 26252 and restarted `npm.cmd run dev` on port 3000.
- Result: `/admin/blogs/test/edit` and `/admin/media` both returned HTTP 200; the fresh dev log had no evaluation-error, invalid-declaration, or `<<<<<<< HEAD` match.
- Verdict: the source-side conflict markers had already been resolved, but the prior dev process retained their failed CSS evaluation. Restarting the repository dev server refreshed the module graph and removed the browser error.
