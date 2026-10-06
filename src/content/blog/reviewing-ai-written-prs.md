---
title: "Reviewing AI-written PRs as a tech lead: verification is the bottleneck, not generation"
description: "Agents made writing code cheap, not reviewing it. How a team that runs its own coding agents keeps its PR queue reviewable."
pubDate: 2026-10-06
tags: [ai-agents, code-review, go, tech-lead]
draft: true
---

<!--
EDITING NOTES (delete before publishing)
- [YOUR STORY: ...] = something only you can write. These slots are what make the post yours, so don't cut them.
- [NUMBER: ...] = an anonymized figure (round it, use a ratio or a range).
- [STATUS: ...] = honest status: done, trying it, or planned.
- Keep out: team size if it identifies you, internal service names, the ticket system, agent vendor (unless you're fine naming it).
- The Go/Kafka failure list is a menu, not a claim. Keep only the ones you've actually seen, and add your own.
-->

On October 5, System76 stopped accepting LLM-generated content in issues and pull requests to its COSMIC and Pop!_OS projects: "including code, comments, and descriptions." The reason wasn't ideological. The maintainers were swamped. Too many first-time, LLM-generated PRs, a low acceptance rate, and a small team that has to review all of it.

The Hacker News thread split the way you'd expect: quality versus speed. I think both sides miss what the announcement actually says. **Generating code got cheap. Verifying it didn't.** COSMIC's maintainers didn't run out of code. They ran out of review time.

I lead a small backend team that builds agentic pipelines: agents pick up tickets, write Go, open pull requests and try to fix CI when it breaks. I can't ban AI-written PRs, because we're the ones generating them. So the review queue the open-source maintainers complain about is our own queue, and we built it on purpose.

This post is what I've learned about reviewing that queue without either rubber-stamping it or drowning in it.

In the past you usually have to review by day more or less an average of 2 - 4 PRs per day (depending on the team size and cross colaboration with other teams, in my case we are a team of 4 people). Today in AI ages I consider a lucky day if only have to review 10 PRs in a day.

## The asymmetry

A human-written PR comes with a human who can explain it. You can ask "why did you do it this way?" and get the reasoning, including the alternatives they rejected. An agent-written PR has none of that. The agent that wrote it is gone, its context with it. Asking it again starts a new session that will rationalize whatever is in the diff.

So the cost moved. The author's effort dropped close to zero, and all the work of understanding the change landed on the reviewer. A June 2026 study of 1,154 Reddit and HN posts about "AI slop" (Baltes, Cheong, Treude) found this was the most common complaint: development time got shorter, but teams spent more time reviewing.

Two other findings from this year shaped how I think about it:

- **Agents are good at one-shot tasks and bad at back-and-forth.** An MSR '26 study of 33,707 agent-authored PRs found 28.3% merged without any iteration. But PRs that needed subjective feedback and several rounds stalled or got abandoned. The authors call this an "attention tax": reviewers end up managing stalled automation instead of reviewing finished work.
- **Humans maintain the code anyway.** A May 2026 study following AI-generated files in popular repos for six months found humans did 83% of the later maintenance on those files. Whoever approves the PR is signing up the team to own that code.

I noticed this moment when I was reviewing a PR and commented some questions asking for reasoning behind the changes, and the answers in the PR comments looks like I was talking with a claude session. The result of this process finalizes with me using my own claude session to iterate over the changes and understand what was about.

## What we do instead of a ban

Inside a company, "don't accept AI PRs" isn't the lever. The levers are: who owns a PR, what reaches review, what a PR has to prove before a human looks at it, and when to give up on one.

### 1. Every agent PR has a human owner

The agent opens the PR. A person owns it: whoever sent the ticket to the agent. The owner reads the diff first and is accountable for it as if they'd written it. The reviewer is someone else.

This sounds bureaucratic. It's the most effective rule we have, because it puts back the "why?" that the agent can't answer. If the owner can't explain a line, it doesn't go to review. Well being honest is more like if the owner can't explain what the full code flow interaction does, because reveiwing code line by line as before is a completly madness.

So the next natual steps based on frustration is to build some mechanism (other AI skill) that based on a PR explains in a summarized way what the code tries to do. So a reviwer that will review what other AI agent review already does but with different base context.

### 2. Limit what reaches manual review

The cheapest review is the one that never happens. This is why this PR reviewer agent has been configured in a way to explain to the developer the risks of approving the PR:

- **One ticket, one PR.** No "while I was here" refactors. Agents love tidying adjacent code, and every drive-by change is something else to verify so at least we force to register every change in Jira.
- **A size limit.** 500 code line changes. Above it, the reviewer increases the PR risk.
- **Changes apply over the cortex or are considered core**. Is not the same modify a returning code in an HTTP response than return a new kind of controlled error or implement new features. Every change as a risk cost associated and this must be evaluated.
- **PR without tests.** This is obvious also because we have configured our AI agents to work using TDD but other barrier check is not worhtless. 

There are more other rules but I think that the concept is already explained. If the agent reviewer consider the PR as a low risk then we allow an automatically approve, in other case then the PR warns the affected owner team to review it. Of course this sounds dangerous and it is, so this reviwer comes with hundreds of iterations over it until we feel confortable with it.

### 3. Push the mechanical checks into CI

A reviewer's attention is the scarcest thing in the pipeline. Spending it on formatting, unused imports or a missing `go mod tidy` is a waste. Anything a machine can check, CI checks before a human is asked to look:

- `gofmt`, `go vet`, `staticcheck` / `golangci-lint`
- `go test -race` (agents write concurrent code with alarming confidence)
- `go mod tidy` must produce no diff
- `govulncheck`
- **Flag, don't block:** new dependencies and changes to existing tests. Both are legitimate. Both are where agents most often take a shortcut.

Modified tests aren't a problem in themselves. A test changed in the same PR as the code it tests is exactly where "make it pass" hides, so it gets a human look.

### 4. Review for agent-shaped mistakes

Once CI has done its part, the human review is about what CI can't see. Agent mistakes in our Go codebase have a recognizable shape. This is the list I review against. Keep only what you've seen, and add your own:

- **Errors swallowed or logged and dropped.** `if err != nil { log...; return nil }` in places where the caller needed to know.
- **`context.Context` ignored.** A fresh `context.Background()` deep in a call chain, so cancellation and deadlines stop working.
- **Retries that are reimplemented every time** This is a repeated common DRY princple break if doesnt teach the AI model.
- **Handlers that aren't idempotent** in a system that guarantees redelivery.
- **Goroutines with no way to stop.** Fine in a test, a leak in a long-running consumer.
- **Tests that test the mock.** Coverage goes up and nothing real is checked.
- **A plausible config value with no source.** A timeout or batch size that looks deliberate and was invented.

And every point of the latest ones is something that I detected in different PRs. AI is amazing to develop and every year is better than before, but as humans do, sometimes agents make mistakes.

### 5. Two rounds, then start over

The MSR study matched what we saw: agents are much worse at revising a PR than at writing one. After a couple of review rounds, the agent is mostly patching its patches, and the reviewer is managing the agent.

Our rule: if a PR the reviewer marked as higher risk isn't approvable after two rounds, we close it, fix the ticket with what the review taught us, and run it again. Closing a PR felt wasteful at first. It's cheaper than a third round.

## What I still don't know

- **Reviewer fatigue.** Reading agent code all day is different work from reading colleagues' code. The problem is that if someone in the team has not much experience the approavl of the PR will convert quickly in an auto-approval based on confidence colleages.
- **Juniors.** If agents write the code and seniors review it, how do juniors learn? In PRs is impossible, so what we are testing is to try to collect weekly the most complex techincal problems of the week and try to analize and explain together in a meeting.
- **AI reviewers.** I trust our reviewer agent's judgment. What I haven't solved is re-review. Every change to the PR triggers a new review, the reviewer finds something new, the coding agent fixes it, and the reviewer runs again. Left alone, that loop never ends, and I don't have a good rule yet for when to stop it. In our latest tests, the reviewer classified only about 20% of agent PRs as low risk. So auto-approval doesn't remove much of the review load, but the risk score does help us decide which PRs to review first.

## Checklist

- [ ] Every agent PR has a named human owner who reads it before review
- [ ] Owner and reviewer are different people
- [ ] One ticket, one PR; no drive-by refactors
- [ ] A size limit (500 changed lines); bigger PRs get a higher risk score
- [ ] CI: format, vet, lint, `-race`, `go mod tidy`, `govulncheck`
- [ ] CI flags risks
- [ ] Higher-risk PRs: two rounds, then close and re-ticket

COSMIC's maintainers made the right call for a volunteer project facing strangers' PRs. On a team that runs its own agents, the equivalent decision isn't a ban. It's deciding, deliberately, how much verification you can afford and making the pipeline fit that number.

We are not close to solve the knowledge sharing that was before with pair programming, and also the PR review fatige is far to be mitigated, but step by step and iterating over our developers daily frustrations is what will reach us to find the good shape in our work battlegrounds.

---

### Sources

- [GamingOnLinux: System76 COSMIC projects will no longer accept LLM-generated content](https://www.gamingonlinux.com/2026/10/system76-cosmic-projects-will-no-longer-accept-llm-generated-content-in-code-submissions/)
- [XDA: COSMIC bans all AI-generated submissions because its maintainers were getting swamped](https://www.xda-developers.com/cosmic-bans-all-ai-generated-submissions/)
- [Baltes, Cheong, Treude: "An Endless Stream of AI Slop" (2026)](https://arxiv.org/html/2603.27249v3)
- [Early-Stage Prediction of Review Effort in AI-Generated Pull Requests (MSR '26)](https://arxiv.org/html/2601.00753)
- [To What Extent Does Agent-generated Code Require Maintenance? (2026)](https://arxiv.org/html/2605.06464v1)
- [Developers Digest: What Hacker News gets right about AI coding agents in 2026](https://www.developersdigest.tech/blog/what-hacker-news-gets-right-about-ai-coding-agents-2026)
