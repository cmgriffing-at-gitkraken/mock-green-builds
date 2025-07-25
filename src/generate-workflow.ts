#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { z } from 'zod';

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
const workflow = {
  name: 'Demo Build',
  on: {
    workflow_dispatch: {},
    push: { branches: ['main'] },
  },
  jobs: {
    build: {
      'runs-on': 'ubuntu-latest',
      steps: steps.map((step: { name: string; duration: number }) => ({
        name: step.name,
        run: `echo \"${step.name}\" && sleep ${step.duration}`,
      })),
    },
  },
};

// Ensure output directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Write the YAML file
fs.writeFileSync(outputPath, YAML.stringify(workflow), 'utf-8');

console.log(`Workflow generated at ${outputPath}`); 