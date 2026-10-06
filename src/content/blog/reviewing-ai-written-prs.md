---
title: "Reviewing AI-written PRs as a tech lead: verification is the bottleneck, not generation"
description: "Agents made writing code cheap, not reviewing it. How a team that runs its own coding agents keeps its PR queue reviewable."
pubDate: 2026-10-07
tags: [ai-agents, code-review, go, tech-lead]
draft: false
---

On October 5, System76 stopped accepting LLM-generated content in issues and pull requests to its COSMIC and Pop!_OS projects: "including code, comments, and descriptions." The reason wasn't ideological. The maintainers were swamped. Too many first-time, LLM-generated PRs, a low acceptance rate, and a small team that has to review all of it.

The Hacker News thread split the way you'd expect: quality versus speed. I think both sides miss what the announcement actually says. **Generating code got cheap. Verifying it didn't.** COSMIC's maintainers didn't run out of code. They ran out of review time.

I lead a backend team of four that builds agentic pipelines: agents pick up tickets, write Go, open pull requests and try to fix CI when it breaks. I can't ban AI-written PRs, because we're the ones generating them. So the review queue the open-source maintainers complain about is our own queue, and we built it on purpose.

That queue grew fast. Before agents, I reviewed two to four PRs a day, depending on how much we were working with other teams. Now a day with only ten is a lucky one.

This post is what I've learned about reviewing that queue without either rubber-stamping it or drowning in it.

## The asymmetry

A human-written PR comes with a human who can explain it. You can ask "why did you do it this way?" and get the reasoning, including the alternatives they rejected. An agent-written PR has none of that. The agent that wrote it is gone, its context with it. Asking it again starts a new session that will rationalize whatever is in the diff.

So the cost moved. The author's effort dropped close to zero, and all the work of understanding the change landed on the reviewer. A June 2026 study of 1,154 Reddit and HN posts about "AI slop" (Baltes, Cheong, Treude) found this was the most common complaint: development time got shorter, but teams spent more time reviewing.

Two other findings from this year shaped how I think about it:

- **Agents are good at one-shot tasks and bad at back-and-forth.** An MSR '26 study of 33,707 agent-authored PRs found 28.3% merged without any iteration. But PRs that needed subjective feedback and several rounds stalled or got abandoned. The authors call this an "attention tax": reviewers end up managing stalled automation instead of reviewing finished work.
- **Humans maintain the code anyway.** A May 2026 study following AI-generated files in popular repos for six months found humans did 83% of the later maintenance on those files. Whoever approves the PR is signing up the team to own that code.

I noticed this when I was reviewing a PR and left some comments asking for the reasoning behind the changes. The answers in the PR read like I was talking to a Claude session. It ended with me using my own Claude session to iterate over the changes and understand what they were about.

## What we do instead of a ban

Inside a company, "don't accept AI PRs" isn't the lever. The levers are: who owns a PR, what reaches review, what a PR has to prove before a human looks at it, and when to give up on one.

### 1. Every agent PR has a human owner

The agent opens the PR. A person owns it: whoever sent the ticket to the agent. The owner reads the diff first and is accountable for it as if they'd written it. The reviewer is someone else.

This sounds bureaucratic. It's the most effective rule we have, because it puts back the "why?" that the agent can't answer. If the owner can't explain a line, it doesn't go to review. Well, to be honest, it's more like: if the owner can't explain what the full code flow does, because reviewing code line by line like before is complete madness.

So the natural next step, driven by frustration, was to build a mechanism (another AI skill) that takes a PR and summarizes what the code is trying to do. In other words, a reviewer that reviews what another AI agent already did, but with a different base context.

### 2. Limit what reaches manual review

The cheapest review is the one that never happens. Before a human looks at a PR, a reviewer agent scores how risky it is to approve and explains that risk to the developer. The main things it looks at:

- **One ticket, one PR.** No "while I was here" refactors. Agents love tidying adjacent code, and every drive-by change is something else to verify. At the very least, every change has to be registered in Jira.
- **Size.** Anything over 500 changed lines gets a higher risk score.
- **Changes that touch the cortex or anything considered core.** Not every change carries the same risk. Changing a return code in an HTTP response isn't the same as introducing a new kind of controlled error, let alone a new feature. The reviewer weighs each change by what it touches.
- **Missing tests.** Our coding agents already work with TDD, so this should rarely trigger. An extra check is still worth having.

There are more rules, but that's the idea. If the reviewer agent rates a PR as low risk, it's approved automatically. Otherwise, it notifies the owning team to review it. Yes, auto-approval sounds dangerous, and it is. That's why the reviewer went through hundreds of iterations before we were comfortable trusting it.

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
- **Retries that are reimplemented every time.** A common, repeated break of the DRY principle if you don't teach the AI model.
- **Handlers that aren't idempotent** in a system that guarantees redelivery.
- **Goroutines with no way to stop.** Fine in a test, a leak in a long-running consumer.
- **Tests that test the mock.** Coverage goes up and nothing real is checked.
- **A plausible config value with no source.** A timeout or batch size that looks deliberate and was invented.

Every one of these is something I've caught in different PRs. AI is amazing for development and gets better every year, but just like humans, agents sometimes make mistakes.

### 5. Two rounds, then a human decides

The MSR study matched what we saw: agents are much worse at revising a PR than at writing one. After a couple of review rounds, the agent is mostly patching its patches, and the reviewer is managing the agent.

Our rule: if a PR the reviewer marked as higher risk isn't approvable after two rounds, the agent stops and a human reviews it manually. If it still doesn't look good after that, we discard it. Throwing away a PR felt wasteful at first. It's cheaper than a third round with the agent.

## What I still don't know

- **Reviewer fatigue.** Reading agent code all day is different work from reading colleagues' code. The problem is that if someone on the team doesn't have much experience, approving a PR quickly turns into auto-approving it based on trust in their colleagues.
- **Juniors.** If agents write the code and seniors review it, how do juniors learn? In PRs it's impossible, so what we're trying is to collect the most complex technical problems of each week and analyze and explain them together in a meeting.
- **AI reviewers.** I trust our reviewer agent's judgment. What I haven't solved is re-review. Every change to the PR triggers a new review, the reviewer finds something new, the coding agent fixes it, and the reviewer runs again. Left alone, that loop never ends, and I don't have a good rule yet for when to stop it. In our latest tests, the reviewer classified only about 20% of agent PRs as low risk. So auto-approval doesn't remove much of the review load, but the risk score does help us decide which PRs to review first.

## Checklist

- [ ] Every agent PR has a named human owner who reads it before review
- [ ] Owner and reviewer are different people
- [ ] One ticket, one PR; no drive-by refactors
- [ ] A size limit (500 changed lines); bigger PRs get a higher risk score
- [ ] CI: format, vet, lint, `-race`, `go mod tidy`, `govulncheck`
- [ ] CI flags risks
- [ ] Higher-risk PRs: two rounds, then a manual review; discard it if it still doesn't hold up

COSMIC's maintainers made the right call for a volunteer project facing strangers' PRs. On a team that runs its own agents, the equivalent decision isn't a ban. It's deciding, deliberately, how much verification you can afford and making the pipeline fit that number.

We're not close to replacing the knowledge sharing we used to get from pair programming, and review fatigue is far from solved. What has worked so far is always the same move: take the frustrations our developers hit every day and iterate on them, one step at a time, until the process fits the work.

---

### Sources

- [GamingOnLinux: System76 COSMIC projects will no longer accept LLM-generated content](https://www.gamingonlinux.com/2026/10/system76-cosmic-projects-will-no-longer-accept-llm-generated-content-in-code-submissions/)
- [XDA: COSMIC bans all AI-generated submissions because its maintainers were getting swamped](https://www.xda-developers.com/cosmic-bans-all-ai-generated-submissions/)
- [Baltes, Cheong, Treude: "An Endless Stream of AI Slop" (2026)](https://arxiv.org/html/2603.27249v3)
- [Early-Stage Prediction of Review Effort in AI-Generated Pull Requests (MSR '26)](https://arxiv.org/html/2601.00753)
- [To What Extent Does Agent-generated Code Require Maintenance? (2026)](https://arxiv.org/html/2605.06464v1)
- [Developers Digest: What Hacker News gets right about AI coding agents in 2026](https://www.developersdigest.tech/blog/what-hacker-news-gets-right-about-ai-coding-agents-2026)
