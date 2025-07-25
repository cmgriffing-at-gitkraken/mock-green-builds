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

// Build the workflow object
const workflowSteps = steps.map((step: { name: string; duration: number; command: string }) => {
  if (step.name.toLowerCase() === 'checkout code') {
    return {
      name: step.name,
      uses: 'actions/checkout@v4',
    };
  }
  return {
    name: step.name,
    run: `${step.command} && sleep ${step.duration}`,
  };
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
  // Collect unique commands (excluding 'actions/checkout@v4' step)
  const commands = steps
    .filter(step => step.name.toLowerCase() !== 'checkout code')
    .map(step => step.command.split(' ')[0]) // just the script name
    .filter((cmd, idx, arr) => arr.indexOf(cmd) === idx);

  // Read package.json
  const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
  let pkg: any;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch (e) {
    console.error('Could not parse package.json. Skipping modification.');
    process.exit(1);
  }

  // Find missing scripts
  const existingScripts = pkg.scripts || {};
  const missing = commands.filter(cmd => !(cmd in existingScripts));

  if (missing.length > 0) {
    // Ask for permission
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Add missing scripts to package.json? (${missing.join(', ')}) [y/N]: `, answer => {
      if (answer.trim().toLowerCase() === 'y') {
        missing.forEach(cmd => {
          pkg.scripts = pkg.scripts || {};
          pkg.scripts[cmd] = `${cmd}`;
        });
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        console.log(`Added scripts to package.json: ${missing.join(', ')}`);
      } else {
        console.log('No changes made to package.json.');
      }
      rl.close();
    });
  }
} 