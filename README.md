# Client Configuration Validation System

This project manages and validates client-specific configuration files across multiple environments. It ensures that all configurations adhere to a shared JSON schema and follow specific business and promotion rules.

## 🚀 Key Features

- **JSON Schema Validation**: Uses [Ajv](https://ajv.js.org/) to ensure all configurations are valid JSON and match the expected structure.
- **Environment Promotion Rules**: Enforces a strict `test` → `stage` → `production` promotion order.
- **Duplicate Detection**: Ensures `clientId` is globally unique across all environments.
- **PR-Aware Validation**: Automatically detects and validates changed files in Pull Requests.
- **Automated Formatting**: Uses [Prettier](https://prettier.io/) to maintain consistent JSON and TypeScript formatting via separate GitHub Actions.

## 📂 Project Structure

- `client-configurations/`: Contains environment-specific subfolders (`test`, `stage`, `production`) with client JSON files.
- `scripts/`: Contains the TypeScript validation logic (`validate-configs.ts`).
- `schemas/`: Contains the `base-schema.json` used for validation.
- `.github/workflows/`: Contains GitHub Actions for automated CI validation.

## 🛠️ Getting Started

### Prerequisites

- Node.js 24+
- npm

### Installation

```bash
npm install
```

### Local Commands

- **Build**: `npm run build`
- **Validate PR (Incremental)**: `npm run validate`
- **Full Validation**: `npm run validate:full`
- **Validate Single File**: `npm run validate:file <path-to-file>`
- **Format Code**: `npm run format`
- **Check Formatting**: `npm run format:check`

## 🧪 CI/CD

This project uses GitHub Actions to:
1. Validate all Pull Requests to `main`.
2. Post validation results as comments on the PR.
3. Perform a full scan on every merge to `main`.
