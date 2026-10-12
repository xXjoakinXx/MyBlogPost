---
title: "The harness, not the model: what I learned running ticket-to-PR agents for real"
description: "Michael Lynch asks why coding agents are so dumb. After leading a team that runs agents from ticket to pull request, my answer: the brain is fine; the body is ours to build."
pubDate: 2026-10-13
tags: [ai-agents, agentic-coding, ci, platform-engineering, tech-lead]
draft: false
---

Last week Michael Lynch published [Why are coding agents so dumb?](https://mtlynch.io/why-are-coding-agents-so-dumb/), and it hit a nerve on [Hacker News](https://news.ycombinator.com/item?id=50020947). His argument, in one line: "the models are doing the heavy lifting while the agents remain the bottleneck." The brain is good. The body is clumsy.

His examples will be familiar to anyone who uses coding agents daily. An agent split a feature into ten subtasks and ran them one after another, even though most could run in parallel. Another stopped overnight to ask for a branch name and never started the work. Agents ignored instructions to stay away from private files.

I lead a small backend team that builds exactly this kind of thing: pipelines where an agent picks up a ticket, opens a pull request, and tries to heal CI when it goes red. Humans only step in at the beginning and at the end.

My short answer: he's mostly right, but the fix isn't waiting for better agents. Once you run agents unattended, **the harness becomes your product**, and most of what makes agents look dumb is a decision somebody failed to make in the harness.

## 1. The model reasons; your pipeline decides what it's allowed to touch

"The agent" is really two things: **the model**, which reads, plans and writes code, and **the harness**, which decides what the model can do, which tools it gets, how long it runs, and what counts as finished. Interactively, the vendor's harness makes those decisions for you, tuned for a human watching a terminal. In a pipeline, those defaults are wrong almost everywhere, and you have to own every one of them.

In one of our most-used repos, we apply DDD. We defined our domain rules and exactly how the code must be structured, and we use a mediator pattern to route the main logic through commands and queries. Every now and then, the agent simply skipped those rules.

Another time, while we were fighting bugs around third-party tools like Kafka and database connectors, I found an agent in a colleague's PR trying to patch one of those libraries directly, because the installed version didn't behave the way we wanted. That was its first approach. The agent was acting like a junior developer going with the first answer they found on the internet.

Our fix was repository-specific code rules that block these changes, run as a git commit hook and again in the pipeline. By rules I mean deterministic code that checks the AI-generated code, because the only way to control code is with more code. :) Skills or prompt rules give you no guarantee the agent behaves the same way every time. A simple example: if the agent creates a DTO, a check on the folder structure makes sure it lands in the `dtos` folder.

Those problems are now mitigated a lot. Mitigated, because it's iterative: we spot a new weird change from an agent, and we write a rule that protects us from it next time. Little by little, our agents' code is taking the shape the team wants.

Lynch's security point is the clearest example. "Please don't read `.env`" in a prompt is not a control. Scoped credentials, a filesystem limited to the checkout, and network egress decided by the infrastructure are.

## 2. Unattended means nobody is there to answer

Interactive agents are tuned to ask when unsure. That's polite in a terminal and fatal in a pipeline, because nobody is coming. The fix is boring: **pre-answer the questions and make waiting impossible.** Conventions go into the repository as plain instructions, every job has a wall-clock timeout, and agents may only ask questions at the beginning, during exploration.

We never had the branch-name story, because our process always names the branch after the Jira ticket key, and our agents are taught to work that way.

The problem we did find was the review loop. We use separate agents that specialize in one topic, like security or coding practices. The reviewer leaves a suggestion, another agent fixes it, the re-review finds new things worth fixing, and again, and again. Most of the time, those findings weren't real issues, or had little impact. So we added a risk classification that decides whether a finding gets fixed at all. It works really well for us.

Now our loop is as autonomous as we want it to be, and it mostly depends on how well the developer wrote the Jira ticket. A badly defined ticket means more questions and more reasoning from the model. A well-defined one runs almost entirely on its own.

## 3. "Done" is decided by the build, never by the agent

**The agent will tell you it's finished.** It will tell you the tests pass. Sometimes it's even right. In our pipeline its opinion counts for nothing. A run is done when deterministic gates say so: it compiles, the tests pass, linters pass with the same config humans use, and contract checks pass for the services it touched.

An agent optimizing for "make CI green" will occasionally find the shortest path, and the shortest path to a passing test is not always fixing the code. So the fix is the same as before: deterministic code that checks the agent didn't `t.Skip()` a test, which is something we actually caught. And just like our code-practice rules carry a risk level, CI raises a warning when a change modifies a test's expected output.

## 4. Parallelism is a harness problem, and serial is sometimes right

Lynch's ten-serial-subtasks example is fair. It's also where I'd push back a little. Running subtasks in parallel inside one working copy is how you get agents overwriting each other's changes, because the subtasks touch the same files, the same go.mod, the same generated code. Sometimes serial is the agent being careful, not dumb.

What works for us is parallelism where the work is actually isolated: per ticket and per repository, each with its own branch and git worktree. Conflicts surface at merge time, through the normal PR flow, and since they always come from different Jira tickets, the scope of each side is clear.

The level of parallelism is decided in the Jira ticket, based on how many repositories it changes. Say a ticket is a full integration between a frontend repo and a backend API repo. The ticket says explicitly that both repos are affected, then describes the new behaviour and the acceptance criteria.

Our coordinator agent reads the ticket first and blocks the run if it isn't well defined. (The check boils down to: context is clear, behaviour is clear, acceptance criteria are clear, go ahead.) Next, it defines a shared contract between the sub-agents. Then it delegates exploration and implementation to one sub-agent per repo, each in its own git worktree. When a sub-agent finishes, it validates its PR against the contract and reports back to the coordinator.

[![Ticket-to-PR flow: the coordinator agent checks the Jira ticket, defines a shared contract, and fans out to one sub-agent per affected repo, each in its own git worktree; the resulting PRs go through CI and human review. Single-repo tickets run sub-agents in sequential waves.](/blog/the-harness-not-the-model/coordinator-sub-agents.svg)](/blog/the-harness-not-the-model/coordinator-sub-agents.svg)

Tickets that touch a single repo follow the same workflow, but the coordinator runs its sub-agents in sequential waves. It's much slower, but there's no conflict trouble, you can follow how the implementation evolves and, most importantly, it teaches the team to split Jira tickets with this in mind.

Working this way, we usually have at least two agents running in parallel, and at most... whatever your machine can handle. (Twelve is my record so far. :D)

## 5. Budgets are a feature, not a finance problem

Unattended agents need hard limits. Ours, per job: a **retry count**, because an agent that failed to fix the same test three times rarely gets there on the fourth, and a **scope cap**, because a one-line ticket producing a 900-line diff is a signal, not a success.

Lynch also complains that agents don't route grunt work to cheaper models. In a pipeline, that routing is yours to decide. We use the most capable model for the early steps (definition and planning), and a cheaper one once there's a well-defined plan to implement: Opus for planning, Sonnet for implementation.

## 6. CI healing: knowing when to stop

CI healing is where agents earn their keep, and also where they can burn the most money. They "fix" flaky tests that were never broken, retry infrastructure failures no code change will solve, or make the failing assertion pass without understanding why it failed.

So the most valuable part of a healing loop is the classification step in front of it. We wait for CI to run, pull the error logs and identify what kind of failure it is: a vulnerability check, new tests failing, the integration-test infrastructure failing, and so on. Then the agent fixes the issue, commits and pushes on its own (otherwise there's no point in automatic CI healing). The process stops if the classification finds something critical, like a vulnerability whose fix is a breaking change, or after three iterations.

That handles almost all of our CI failures, because most are small: a vulnerability, or new tests that weren't well defined. The one scenario where it always fails is a big new vulnerability in one of our third-party integration tools. Honestly, that's exactly where I want it to fail. :)

## 7. The review gate is still a human, for now

A person still reviews every agent PR before merge. Deterministic gates prove the code builds and the tests pass. They don't prove it's the right change, that it fits the architecture, or that it handles what a service sees in production: retries, duplicate messages, partial failures.

How closely I look depends on how deep the change goes. In our DDD repo, I always look carefully at changes to the core domain logic. Network integration points always worry me too: Kafka consumers, gRPC servers, GraphQL clients. And my reviews have moved from reading line by line to reviewing the integration flow. AI agents can write really good code, and even better once you teach them. But a connection without TLS, a new Mongo collection nobody needs, or an N-layer cache tier from day one: those are things a human eye catches faster.

## Where Lynch is right, and where I'd push back

He's right that access control must be deterministic, that agents shouldn't block on trivial questions, and that benchmarks measure models, not harnesses. Where I'd push back: serial execution isn't proof of dumbness, and waiting for vendors to fix the body won't work. If you run agents unattended, the body is yours.

Where I agree with him most is his diagnosis of why: the people deciding what agents do are disconnected from the developers who use them every day. AI is very good at parallel work, yet no coding agent lets you use that out of the box without heavily tuning the harness around your daily work. Experienced engineering teams are the ones adding rules, context and skills so the AI works the way a software engineer would. Someone without that experience won't add any of it, and will end up building poor software.

## The takeaway

If your coding agents look dumb, look at the harness before you blame the model. Make finishing machine-checkable. Make waiting impossible. Make access deterministic. Classify failures before you try to heal them. Keep a human at the merge gate.

None of that is glamorous, and that's the point: the model gets better every few months on its own. The harness only gets better when someone on your team decides to own it.

---

### Sources

- [Michael Lynch: Why are coding agents so dumb?](https://mtlynch.io/why-are-coding-agents-so-dumb/)
- [Hacker News discussion](https://news.ycombinator.com/item?id=50020947)
