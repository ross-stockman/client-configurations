# AI Context: Client Configuration Validation System

## 📌 Purpose

This repository contains **client configuration files** used by a system that processes ~20 clients. Each client has a configuration based on a **shared schema**, but may include **client-specific properties**.

This project includes a **GitHub Actions validation system** that ensures configuration correctness and enforces business rules before changes are merged into `main`.

AI assistants (e.g., GitHub Copilot) should use this document as the **source of truth** when generating validation logic, scripts, or schema updates.

---

## 🧗 Technology Stack

### Required

* **Node.js**
* **TypeScript (MANDATORY)**
* **Ajv** for JSON schema validation

### Important Notes

* All validation logic MUST be written in **TypeScript**
* Code is compiled to JavaScript (`/dist`) for execution in GitHub Actions
* Type safety is critical for maintainability and correctness

---

## 🗂️ Repository Structure

```plaintext
/client-configurations/
  /test/
    clientA.json
    clientB.json
  /stage/
    clientA.json
  /production/
    clientA.json

/scripts/
  validate-configs.ts

/dist/
  validate-configs.js

/schemas/
  base-schema.json
```

### Key Notes

* Each folder represents an **environment**:

    * `test`
    * `stage`
    * `production`
* Each file represents a **single client configuration**
* File names typically map to `clientId`

---

## 🧾 Configuration Model

### Base Schema Characteristics

* JSON-based configuration files
* Shared core fields across all clients
* Some clients may include **additional optional properties**
* Schema is intentionally **loosely enforced**

### Example

```json
{
  "clientId": "clientA",
  "name": "Client A",
  "featureFlags": {
    "enableFeatureX": true
  },
  "customProperty": "optional-per-client"
}
```

---

## 🧠 TypeScript Data Model (Canonical)

AI-generated code should use these patterns:

```ts
type Environment = "test" | "stage" | "production";

interface BaseConfig {
  clientId: string;
  name: string;
  featureFlags?: Record<string, boolean>;
  [key: string]: unknown; // allow flexible properties
}

type ClientMatrix = {
  [clientId: string]: Partial<Record<Environment, BaseConfig>>;
};
```

---

## ⚙️ Validation System Overview

Validation is executed via:

* GitHub Actions (on pull requests)
* A TypeScript script: `/scripts/validate-configs.ts`
* Compiled output: `/dist/validate-configs.js`

Validation is **PR-aware**, meaning:

* It compares the PR branch with `main`
* It validates changed files, while referencing all configs when needed

---

## 🔍 Validation Responsibilities

### 1. JSON Schema Validation

* All config files must pass schema validation
* Use **Ajv**
* Prefer typed schemas when possible:

```ts
import { JSONSchemaType } from "ajv";
```

* Errors must include:

    * File name
    * Clear reason

---

### 2. Duplicate Client ID Detection

* `clientId` must be globally unique
* No duplicates across:

    * Same environment
    * Different environments

---

### 3. Environment Promotion Rules

#### Rule A: No Multi-Environment Introduction

A client **cannot be introduced into multiple environments in the same PR**

❌ Invalid:

* Adding `clientX` to both `/stage` and `/production` in one PR

---

#### Rule B: Promotion Order Required

A client must exist in a **lower environment before higher**

Required order:

```plaintext
test → stage → production
```

##### Examples

❌ Invalid:

* Adding client directly to `production` without existing in `stage`

✅ Valid:

* Client exists in `stage`, then added to `production`

---

### 4. Change Detection Logic

Validation must distinguish between:

* Existing configs (already in `main`)
* Newly added configs (in PR)
* Modified configs

Use:

```bash
git diff --name-only origin/main...HEAD
```

---

### 5. Business Rule Validation

Custom rules may include:

* Required fields based on feature flags
* Forbidden properties in certain environments
* Value constraints (e.g., enums, ranges)

Rules should be implemented as **typed functions**:

```ts
function validateSchema(...) {}
function validateDuplicates(...) {}
function validateEnvironmentPromotion(...) {}
function validateBusinessRules(...) {}
```

### 6. Auto-format JSON (Prettier)

* All configuration files and scripts must be formatted using Prettier.
* The validation script checks formatting and will fail if files are not compliant.
* Use `npm run format` to fix formatting issues locally.

---

## ❌ Error Handling Requirements

* All validation errors must be collected (do not fail fast)
* Output must be readable in GitHub Actions logs

### Example Output

```plaintext
❌ Validation failed:

- Schema error in stage/clientA.json: missing required property 'name'
- Duplicate clientId: clientB
- Client clientX cannot be introduced in stage and production in the same PR
```

* Exit with non-zero status to fail the workflow

---

## 🧠 AI Assistant Guidelines

When generating code, ALWAYS:

### ✅ DO

* Use **TypeScript (no plain JavaScript)**
* Use **strong typing for all data structures**
* Use `ajv` for schema validation
* Use `Record`, `Partial`, and union types appropriately
* Write modular, readable validation functions
* Include clear error messages
* Load and compare both:

    * base branch configs
    * PR configs
* Keep logic deterministic and testable

---

### ❌ DO NOT

* Do NOT generate plain JavaScript
* Do NOT use `any` unless absolutely necessary
* Do NOT assume strict schema (it is intentionally flexible)
* Do NOT hardcode client names
* Do NOT ignore cross-environment validation
* Do NOT validate files in isolation (context matters)

---

## 🔧 Implementation Hints

* Build an in-memory structure like:

```ts
const matrix: ClientMatrix = {
  clientA: {
    test: {...},
    stage: {...},
    production: {...}
  }
};
```

* Track:

```ts
existsInBase(clientId, env)
existsInPR(clientId, env)
isNewInPR(clientId, env)
```

---

## 🚀 Future Enhancements (Optional)

* PR comment feedback via GitHub API
* Config diff visualization
* Rule configuration via external file

---

## 📣 Summary

This system ensures:

* Configuration correctness
* Safe environment promotion
* Prevention of human error in PRs

AI-generated code must prioritize:

* **type safety**
* correctness
* clarity
* maintainability
* explicit rule enforcement

---
