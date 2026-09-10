# Product Definition

## Product thesis

This product is a SaaS for small and medium businesses and marketing agencies that need to create marketing assets and plans quickly without becoming prompt engineers.

The value proposition is not "selling prompts". The system should understand the user's objective and business context, select the appropriate workflow/skill internally, and deliver a structured result that is immediately useful.

## Problem

Today, users who want to use AI for marketing often need to:

- search for prompts manually;
- learn which prompt works for each task;
- repeat company context in every request;
- compare many tools or workflows;
- reformat generic AI output into something usable;
- spend time orchestrating instead of executing marketing.

## Target users

### Primary

- small and medium business owners;
- internal marketing teams;
- small marketing agencies;
- freelancers managing multiple clients.

### Initial jobs to be done

Users should be able to provide a business context and ask the system to help with common marketing workflows such as:

- campaign planning;
- content planning;
- social media content structure;
- offer/copy ideation;
- creative briefs;
- audience/message angles;
- launch or promotion plans.

## Product principle

The user chooses the outcome, not the prompt.

The system is responsible for:

1. understanding the objective;
2. collecting only the missing business context;
3. selecting the appropriate internal workflow;
4. generating a structured result;
5. preserving reusable business/client context;
6. making the result easy to edit, reuse and export.

## MVP hypothesis

The MVP should prove that users receive better and faster marketing outputs from a guided workflow than from a blank chat or a static prompt library.

## MVP scope

### Must have

- authentication;
- user/workspace context;
- business/client profile;
- workflow catalog with a small curated set of high-value marketing workflows;
- guided workflow execution;
- structured AI result;
- history of generated outputs;
- basic usage accounting;
- responsive web interface.

### Should have after core validation

- favorites/templates;
- reusable brand voice/context;
- export/copy improvements;
- workspace/client organization for agencies;
- additional AI providers/models;
- billing and plan limits.

### Explicitly out of MVP unless required by validation

- marketplace of prompts;
- autonomous multi-channel publishing;
- full CRM;
- broad social analytics platform;
- complex no-code workflow builder;
- custom model training;
- enterprise permission matrix.

## Success signals

Early validation should focus on behavioral signals rather than vanity metrics:

- user reaches a useful output quickly;
- user reuses the platform for another marketing job;
- user creates/saves business context instead of starting from zero;
- generated output requires less manual restructuring than a blank chat experience;
- token cost per useful generation remains economically viable.

## Open product questions

These should be answered through MVP usage rather than speculative architecture:

- Which 3–5 workflows create the highest repeated value?
- Is the primary paying user the business owner or the agency?
- How much business context should be persisted before onboarding becomes too heavy?
- Which outputs need document-style editing versus simple copy/export?
- What pricing metric maps best to perceived value: generations, credits, seats, workspaces or hybrid?
