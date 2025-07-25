# Mock Green Builds

This project provides a TypeScript CLI tool to generate a GitHub Actions workflow file from a JSON description of build steps. It's useful for demoing successful build pipelines with custom step names and durations.

## Features
- Input: JSON file describing build steps (name and duration)
- Output: GitHub Actions workflow YAML file simulating those steps
- Input validation using [zod](https://github.com/colinhacks/zod)

## Installation

1. Clone the repository.
2. Install dependencies using [pnpm](https://pnpm.io/):
   ```sh
   pnpm install
   ```

## Usage

Run the CLI with:

```sh
pnpm start <input.json> <output.yml>
```

- `<input.json>`: Path to your input JSON file describing the steps.
- `<output.yml>`: Path to the output GitHub Actions workflow file (e.g., `.github/workflows/demo.yml`).

### Example

#### input.json
```json
{
  "steps": [
    { "name": "Checkout code", "duration": 5 },
    { "name": "Install dependencies", "duration": 10 },
    { "name": "Running unit tests", "duration": 30 },
    { "name": "Build project", "duration": 15 }
  ]
}
```

#### Command
```sh
pnpm start input.json .github/workflows/demo.yml
```

#### Output: .github/workflows/demo.yml
```yaml
name: Demo Build
on:
  workflow_dispatch: {}
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        run: echo "Checkout code" && sleep 5
      - name: Install dependencies
        run: echo "Install dependencies" && sleep 10
      - name: Running unit tests
        run: echo "Running unit tests" && sleep 30
      - name: Build project
        run: echo "Build project" && sleep 15
```

## Notes
- The script validates the input JSON and will print errors if the format is invalid.
- The durations are in seconds and use the `sleep` command to simulate step time.

## License
MIT 