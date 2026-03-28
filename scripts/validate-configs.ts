import fs from "fs";
import path from "path";
import Ajv from "ajv";
import { execSync } from "child_process";

// ---- Types ----

type Environment = "test" | "stage" | "production";

interface BaseConfig {
  clientId: string;
  name: string;
  featureFlags?: Record<string, boolean>;
  [key: string]: unknown;
}

type ClientMatrix = {
  [clientId: string]: Partial<Record<Environment, { config: BaseConfig; filePath: string }>>;
};

// ---- Load Schema ----

const schemaPath = path.join(__dirname, "../schemas/base-schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile<BaseConfig>(schema);

// ---- Helpers ----

function getChangedFiles(): Set<string> {
  try {
    const baseBranch = process.env.BASE_BRANCH || "origin/main";
    const diff = execSync(`git diff --name-only ${baseBranch}...HEAD`, { encoding: "utf-8" });
    return new Set(diff.split("\n").filter(Boolean).map(f => path.resolve(f)));
  } catch (e) {
    console.warn("⚠️ Could not detect git diff, assuming all files are 'new' for validation purposes.");
    return new Set();
  }
}

function getAllConfigFiles(): { env: Environment; filePath: string }[] {
  const envs: Environment[] = ["test", "stage", "production"];
  const results: { env: Environment; filePath: string }[] = [];

  for (const env of envs) {
    const dir = path.resolve(__dirname, "..", env);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        results.push({
          env,
          filePath: path.join(dir, file)
        });
      }
    }
  }

  return results;
}

// ---- Validation Logic ----

function buildMatrix(files: { env: Environment; filePath: string }[]): { matrix: ClientMatrix; errors: string[] } {
  const matrix: ClientMatrix = {};
  const errors: string[] = [];

  for (const { env, filePath } of files) {
    const raw = fs.readFileSync(filePath, "utf-8");
    let config: BaseConfig;
    try {
      config = JSON.parse(raw);
    } catch (e) {
      errors.push(`Invalid JSON in ${filePath}`);
      continue;
    }

    // Schema validation
    if (!validate(config)) {
      errors.push(`Schema error in ${filePath}: ${ajv.errorsText(validate.errors)}`);
    }

    const clientId = config.clientId;
    if (!matrix[clientId]) {
      matrix[clientId] = {};
    }

    if (matrix[clientId][env]) {
      errors.push(`Duplicate clientId '${clientId}' found in same environment '${env}': ${filePath} and ${matrix[clientId][env]?.filePath}`);
    }

    matrix[clientId][env] = { config, filePath };
  }

  return { matrix, errors };
}

function validatePromotionRules(matrix: ClientMatrix, changedFiles: Set<string>): string[] {
  const errors: string[] = [];
  const envOrder: Environment[] = ["test", "stage", "production"];

  for (const [clientId, envs] of Object.entries(matrix)) {
    const introducedInEnvs = envOrder.filter(env => {
      const entry = envs[env];
      return entry && (changedFiles.size === 0 || changedFiles.has(path.resolve(entry.filePath)));
    });

    // Rule A: No Multi-Environment Introduction
    if (introducedInEnvs.length > 1) {
      errors.push(`Client '${clientId}' cannot be introduced/modified in multiple environments in the same PR: ${introducedInEnvs.join(", ")}`);
    }

    // Rule B: Promotion Order Required
    for (let i = 1; i < envOrder.length; i++) {
      const currentEnv = envOrder[i];
      const prevEnv = envOrder[i - 1];

      if (envs[currentEnv] && !envs[prevEnv]) {
        errors.push(`Promotion error: Client '${clientId}' exists in '${currentEnv}' but is missing from lower environment '${prevEnv}'`);
      }
    }
  }

  return errors;
}

// ---- Main ----

function main() {
  const changedFiles = getChangedFiles();
  const allFiles = getAllConfigFiles();

  const { matrix, errors: schemaErrors } = buildMatrix(allFiles);
  const promotionErrors = validatePromotionRules(matrix, changedFiles);

  const allErrors = [...schemaErrors, ...promotionErrors];

  if (allErrors.length > 0) {
    console.error("\n❌ Validation failed:\n");
    allErrors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
  } else {
    console.log("✅ Validation passed");
  }
}

main();
