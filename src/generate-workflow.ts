#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { z } from 'zod';
import readline from 'readline';

if (process.argv.length < 4) {
  console.error('Usage: generate-workflow <input.json> <output.yml>');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

// Define the schema using zod
const StepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  duration: z.number().positive('Duration must be a positive number'),
  command: z.string().min(1, 'Command is required'),
});
const InputSchema = z.object({
  steps: z.array(StepSchema).min(1, 'At least one step is required'),
});

// Read and parse the input JSON
const inputRaw = fs.readFileSync(inputPath, 'utf-8');
let input: unknown;
try {
  input = JSON.parse(inputRaw);
} catch (e) {
  console.error('Input file is not valid JSON.');
  process.exit(1);
}

// Validate input
const parsed = InputSchema.safeParse(input);
if (!parsed.success) {
  console.error('Input validation error:', parsed.error.format());
  process.exit(1);
}

const steps = parsed.data.steps;

// Build the workflow steps
const workflowSteps: any[] = [];

// Add checkout step if present
workflowSteps.push({
  name: "Checkout repo",
  uses: "actions/checkout@v4"
})

// Always add pnpm install step after checkout
workflowSteps.push({
  name: 'Install pnpm',
  run: 'corepack enable && corepack prepare pnpm@latest --activate',
});

// Add the rest of the steps (excluding checkout)
steps.forEach((step, idx) => {
  workflowSteps.push({
    name: step.name,
    run: `pnpm ${step.command}`,
  });
});

const workflow = {
  name: 'Demo Build',
  on: {
    workflow_dispatch: {},
    push: { branches: ['main'] },
  },
  jobs: {
    build: {
      'runs-on': 'ubuntu-latest',
      steps: workflowSteps,
    },
  },
};

// Ensure output directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Write the YAML file
fs.writeFileSync(outputPath, YAML.stringify(workflow), 'utf-8');

console.log(`Workflow generated at ${outputPath}`);

// --- Package.json modification logic ---
const pkgPath = path.resolve('package.json');
if (fs.existsSync(pkgPath)) {
  // Read package.json
  const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
  let pkg: any;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch (e) {
    console.error('Could not parse package.json. Skipping modification.');
    process.exit(1);
  }

  // Ask for permission
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`Overwrite/add scripts in package.json? (${steps.map(step => step.command).join(', ')}) [y/N]: `, answer => {
    if (answer.trim().toLowerCase() === 'y') {
      steps.forEach(step => {
        if(step.command !== "install") {
          pkg.scripts = pkg.scripts || {};
            pkg.scripts[step.command] = `sleep ${step.duration}`;
        }
      });
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      console.log(`Overwritten/added scripts in package.json: ${steps.map(step => step.command).join(', ')}`);
    } else {
      console.log('No changes made to package.json.');
    }
    rl.close();
  });
} 