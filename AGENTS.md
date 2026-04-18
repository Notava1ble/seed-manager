ALWAYS USE BUN WHEN POSSIBLE.

When prompted to brainstorm, use short, concise and meaningful ideas, rather than fully planned responses. Ask questions, and ecourage collaboration. Keep the response relatively short.

For project overview and usage, read `seed-manager-routing.plan.md` and `seed-manager-v1.plan.md`..

## Code quality

Do not try to create components and abstract function that are only used once.

Prefer using one file per react component, unless it makes since not to. For helper functions however, try and put them in the lib folder.

When writing ui, check for components to reuse. Also, search the codebase for similar ui that is hard coded, and suggest to me in you should extract that ui as a component before taking action.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

<!-- convex-ai-end -->
