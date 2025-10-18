Contributing
=============

How we work
------------
- Create small, focused branches using the pattern `feat/<short>` or `fix/<short>`.
- Open pull requests and include a short description and a "Why" section explaining the motivation for the change.
- Keep PRs small (preferably <200 lines changed) to make reviews fast.

Commit messages
---------------
- Use conventional commit style for clarity. Examples:
  - `feat(theme): add dark mode toggle`\
  - `fix(prompt): ensure audience validation runs`\
  - `chore(ci): update package-lock.json to fix npm ci`
- In the commit body include a one-line "Why" paragraph describing the intent and any migration steps.

Testing & CI
-----------
- We run unit tests with `npm test` (Jest) and UI tests with pytest + Selenium where applicable.
- Each PR should pass the CI checks before merging. If a test is flaky, mark it and open a follow-up issue rather than bypassing CI.

Code style
----------
- We prefer consistent formatting. Add ESLint and Prettier in follow-up PRs; for now use reasonable defaults and keep changes small.

Releasing the design-system (notes)
----------------------------------
- The `design-system` folder is a local package used by multiple projects. For long-term reuse we will publish to a private npm/GitHub Package registry and pin versions in consuming projects.
