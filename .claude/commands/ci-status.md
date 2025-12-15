---
description: Check GitLab CI pipeline status for current branch
allowed-tools: Bash(curl:*), Bash(git:*), Bash(jq:*)
---

Check GitLab CI pipeline status.

## Context

- Current branch: !`git branch --show-current`
- GitLab URL: gitlab.syncad.com
- Project ID: 515

## Task

1. Get latest pipeline for current branch:

```bash
curl -s "https://gitlab.syncad.com/api/v4/projects/515/pipelines?ref=$(git branch --show-current)&per_page=3" \
  -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" | jq '.'
```

2. If pipeline exists, get job statuses:

```bash
curl -s "https://gitlab.syncad.com/api/v4/projects/515/pipelines/{PIPELINE_ID}/jobs" \
  -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" | jq '.[] | {name, status, stage}'
```

3. Report:
   - Pipeline status (running/success/failed)
   - Failed jobs with error info
   - Deployment status if applicable
