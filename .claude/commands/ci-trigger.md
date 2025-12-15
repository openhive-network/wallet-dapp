---
description: Trigger GitLab CI pipeline for current branch
allowed-tools: Bash(curl:*), Bash(git:*), Bash(jq:*)
---

Trigger a new GitLab CI pipeline.

## Context

- Current branch: !`git branch --show-current`
- GitLab URL: gitlab.syncad.com
- Project ID: 515

## Task

Trigger pipeline:

```bash
curl -s -X POST "https://gitlab.syncad.com/api/v4/projects/515/pipeline" \
  -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"ref": "'$(git branch --show-current)'"}' | jq '.'
```

Report the pipeline URL and ID.
