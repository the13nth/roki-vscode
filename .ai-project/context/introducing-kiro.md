---
id: 79be0cf0-6317-4cda-98fe-83e06ce90726
title: Introducing Kiro
category: news-article
tags: 
url: https://kiro.dev/blog/introducing-kiro/
---

Kiro


VP DevEx & Agents

I’m sure you’ve been there: prompt, prompt, prompt, and you have a working application. It’s fun and feels like magic. But getting it to production requires more. What assumptions did the model make when building it? You guided the agent throughout, but those decisions aren’t documented. Requirements are fuzzy and you can’t tell if the application meets them. You can’t quickly understand how the system is designed and how that design will affect your environment and performance. Sometimes it’s better to take a step back, think through decisions, and you’ll end up with a better application that you can easily maintain. That’s what Kiro helps you do with spec-driven development.

I'm excited to announce Kiro, an AI IDE that helps you deliver from concept to production through a simplified developer experience for working with AI agents. Kiro is great at ‘vibe coding’ but goes way beyond that—Kiro’s strength is getting those prototypes into production systems with features such as specs and hooks.
Venn diagram with a ghost logo in the overlap between “the flow of vibe coding” and “the clarity of specs”

Kiro specs are artifacts that prove useful anytime you need to think through a feature in-depth, refactor work that needs upfront planning, or when you want to understand the behavior of systems—in short, most things you need to get to production. Requirements are usually uncertain when you start building, which is why developers use specs for planning and clarity. Specs can guide AI agents to a better implementation in the same way.

Kiro hooks act like an experienced developer catching things you miss or completing boilerplate tasks in the background as you work. These event-driven automations trigger an agent to execute a task in the background when you save, create, delete files, or on a manual trigger.
Building with Specs and Hooks

Kiro accelerates the spec workflow by making it more integrated with development. In our example, we have an e-commerce application for selling crafts to which we want to add a review system for users to leave feedback on crafts. Let's walk through the three-step process of building with specs.
ArtisanMarket with a grid of products for sale and an individual product page
The ecommerce app that we are working with
1. From single prompt to requirements

Kiro unpacks requirements from a single prompt—type "Add a review system for products" and it generates user stories for viewing, creating, filtering, and rating reviews. Each user story includes EARS (Easy Approach to Requirements Syntax) notation acceptance criteria covering edge cases developers typically handle when building from basic user stories. This makes your prompt assumptions explicit, so you know Kiro is building what you want.
IDE showing a prompt “Add a review system for products” followed by AI-generated Markdown
Kiro requirements specs
2. Technical design based on requirements

Kiro then generates a design document by analyzing your codebase and approved spec requirements. It creates data flow diagrams, TypeScript interfaces, database schemas, and API endpoints—like the Review interfaces for our review system. This eliminates the lengthy back-and-forth on requirements clarity that typically slows development.
IDE with Component Hierarchy Diagram
Kiro design specs with interfaces, mermaid and data flow diagrams
3. Implement tasks

Kiro generates tasks and sub-tasks, sequences them correctly based on dependencies, and links each to requirements. Each task includes details such as unit tests, integration tests, loading states, mobile responsiveness, and accessibility requirements for implementation. This lets you check work in steps rather than discovering missing pieces after you think you're done.
Markdown task list for product-review-system
Kiro simplifies this entire process by autogenerating the tasks and sub-tasks, sequencing them in the right order, and linking each task back to requirements so nothing falls through the cracks. As you can see below, Kiro has thought of writing unit tests for each task, added loading states, integration tests for the interaction between products and reviews, and responsive design and accessibility.

The task interface lets you trigger tasks one-by-one with a progress indicator showing execution status. Once complete, you can see the completion status inline and audit the work by viewing code diffs and agent execution history.
ArtisanGoods product page with sortable (by dates or ratings) and filterable (by stars) reviews

Kiro's specs stay synced with your evolving codebase. Developers can author code and ask Kiro to update specs or manually update specs to refresh tasks. This solves the common problem where developers stop updating original artifacts during implementation, causing documentation mismatches that complicate future maintenance.
4. Catch issues before they ship with hooks

Before submitting code, most developers run through a mental checklist: Did I break anything? Are tests updated? Is documentation current? This caution is healthy but can take a lot of manual work to implement.

Kiro's agent hooks act like an experienced developer catching things you miss. Hooks are event-driven automations that execute when you save or create files—it’s like delegating tasks to a collaborator. Set up a hook once, and Kiro handles the rest. Some examples:

    When you save a React component, hooks update the test file.

    When you modify API endpoints, hooks refresh README files.

    When you're ready to commit, security hooks scan for leaked credentials.

Hooks enforce consistency across your entire team. Everyone benefits from the same quality checks, code standards, and security validation fixes. For our review feature, I want to ensure any new React component follows the Single Responsibility Principle so developers don't create components that do too many things. Kiro takes my prompt, generates an optimized system prompt, and selects the repository folders to monitor. Once this hook is committed to Git, it enforces the coding standard across my entire team—whenever anyone adds a new component, the agent automatically validates it against the guidelines.
Form with prompt “Anytime a component is added make sure it follow the single responsibility principle”
Create a hook to trigger on file save
Everything Else You'd Expect

Beyond specs and hooks, Kiro includes all the features you'd expect from an AI code editor: Model Context Protocol (MCP) support for connecting specialized tools, steering rules to guide AI behavior across your project, and agentic chat for ad-hoc coding tasks with file, URL, Doc’s context providers. Kiro is built on Code OSS, so you can keep your VS Code settings and Open VSX compatible plugins while working with our IDE. You get the full AI coding experience, plus the fundamentals needed for production.
The Future

Our vision is to solve the fundamental challenges that make building software products so difficult—from ensuring design alignment across teams and resolving conflicting requirements, to eliminating tech debt, bringing rigor to code reviews, and preserving institutional knowledge when senior engineers leave. The way humans and machines coordinate to build software is still messy and fragmented, but we're working to change that. Specs is a major step in that direction. Ready to experience spec-driven development? Kiro is free during preview, with some limits. We're excited to see you try it out to build real apps and would love to hear from you on our Discord server.
Social

Site Terms
License
Responsible AI Policy
Legal
Privacy Policy
Cookie Preferences
