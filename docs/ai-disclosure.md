# AI Usage Disclosure

This project was developed with AI assistance under direct human supervision.

The implementation workflow used OpenCode with OpenAI/Codex-family models, together with the Oh My OpenAgent plugin/orchestration setup. The human developer directed the requirements, technology choices, architecture, phase boundaries, review decisions, and final acceptance of changes.

This document describes the current project workflow and should be updated if the way AI is used in this repository changes.

## Tools Used

The AI-assisted workflow for this repository used:

- OpenCode as the coding agent environment.
- OpenAI/Codex-family models through that environment.
- Oh My OpenAgent as the orchestration layer on top of OpenCode.
- Tooling exposed through that setup such as:
  - LSP-based diagnostics
  - MCP integrations, including Context7-style documentation grounding
  - specialist/subagent-style workflows for search, research, planning, review, and implementation support

These tools were used to improve grounding, search quality, verification, and consistency. They were not used as an autonomous product owner.

## How AI Was Used

AI assistance was used to:

- turn the initial requirements into an implementation plan
- propose and refine architecture and technical decisions
- help break the work into phases and reviewable pull requests
- implement code, tests, Docker support, and documentation incrementally
- run or summarize verification steps such as linting, type checking, tests, migrations, and build checks
- revise code and docs after review findings or human feedback

## Workflow Used In This Repository

The work was not produced in one pass.

The workflow for this repository was:

1. Start from the functional requirements in `plans/api-service-requirements.md`.
2. Add explicit human direction about the chosen stack, architecture, and engineering constraints.
3. Use a brainstorming phase to answer open questions before implementation.
4. Convert that into a phased plan.
5. Implement each phase in reviewable slices and open a draft PR per phase.
6. Validate each phase with checks such as format, lint, typecheck, tests, migrations, build, and Docker/local smoke checks.
7. Incorporate review feedback and corrections before moving to the next phase.

The planning artifacts for this workflow are stored in the `plans/` directory, including:

- `plans/implementation-plan.md`
- `plans/phase-1-foundation-implementat-2026-06-20-approved.md`
- `plans/phase-2-database-and-domain-im-2026-06-20-approved.md`
- `plans/phase-3-concrete-implementatio-2026-06-20-approved.md`
- `plans/phase-4-implementation-plan-do-2026-06-21-approved.md`
- `plans/scoped-follow-up-plan-local-en-2026-06-20-approved.md`

## Human Review And Corrections

Human direction and review remained responsible for the final result.

Examples of human-guided corrections and review loops in this repository include:

- tightening query safety so repository queries use explicit projections instead of broad selects
- enforcing pagination defaults and maximum limits at the repository level instead of trusting caller input blindly
- changing money handling so exact decimal price strings are preserved instead of using lossy floating-point coercion
- adding regression tests for exact price preservation
- correcting Docker and local environment behavior so both host-run and full Docker workflows are supported
- polishing OpenAPI output, documentation structure, and final readiness checks

The workflow also used additional review loops, including human review, automated CI checks, and review-oriented tooling such as CodeRabbit and oracle-style review passes where applicable, but final decisions remained human-controlled.

## Quality Gates

This repository uses multiple quality gates rather than relying only on generated code output.

Examples include:

- CI checks defined in `.github/workflows/ci.yml`
- integration-first testing through Vitest
- database migration and seed verification
- Docker and host-run smoke checks
- draft pull requests per phase for reviewable change sets

## Current-State Note

This disclosure is a current-state summary of how AI was used in this repository. It is not a complete historical log of every prompt or interaction.
