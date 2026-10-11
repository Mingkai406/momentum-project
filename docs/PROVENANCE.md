# Source provenance

Imported on 2026-10-11 using `git subtree add --squash`; each import has a source commit reference and an original snapshot in this repository's history. The original repositories were not modified.

| Source                       | Imported commit                          | Target                          |
| ---------------------------- | ---------------------------------------- | ------------------------------- |
| Mingkai406/momentum-frontend | df126e7151141cec37fd425e3811ccf10b05ded8 | apps/web                        |
| Mingkai406/momentum-backend  | 940bdd35ab6aeacfcebaaeda235821859f8fa11d | apps/api                        |
| Mingkai406/momentum-project  | e367422acb2381d579378a909d759464254e011a | Original documentation baseline |

`momentum-go-service` at b72c11d31ec1ab717f45b9f65b673d139fe602d6 was inspected but not imported. It had no active integration with the main workflow and included simulation-only distribution logic.

The frontend's role/goal/mentor concepts, Cognito provider and Next.js framework are retained; incomplete pages and the unsafe caller-supplied identity API are replaced. The backend retains Express, PostgreSQL and the GROW/step/check-in/feedback domain. Old maintenance scripts, tracked node_modules, duplicate locks, hard-coded pool configuration and outdated performance/deployment claims are removed from the active tree. Historical snapshots remain accessible in Git.

Historical usage: the owner confirmed approximately 40 mentees used an earlier deployment in their Global Student Mentor context. Exact usage dates, frequency and per-feature adoption are not recorded here. The old deployment is stopped. This statement is not a claim that the new revision has 40 current users.
