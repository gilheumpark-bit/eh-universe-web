# Contributing to NOA Code Studio

First off, thank you for considering contributing to NOA Code Studio. It's people like you that make NOA Code Studio such a great tool.

## General Overview

This project is an AI-first IDE (Code Studio) leveraging the NOA Autonomous Engine. 

**IMPORTANT**: Please ensure you read `GEMINI.md` located in the root of the project. It outlines our `NOA Rules v1.2`, which applies standard and execution rules for code validation. This allows our Multi-Agent pipelines to parse and act properly.

## Development Setup

1. **Prerequisites**:
   - `Node.js` >= 20
   - `pnpm` >= 8

2. **Installation**:
   ```bash
   pnpm install
   ```

3. **Running the App locally**:
   ```bash
   pnpm run dev
   ```

4. **Electron Dev**:
   ```bash
   cd apps/desktop
   npm run dev:electron
   ```

## Workflow & Verification

This project heavily uses the **Verification-First** architecture. Any change must pass the CI tests before merging to the `main` branch:

- `npm run verify:static`
- Write clear descriptions of how to verify your logic manually or autonomously.

Thanks for contributing!
