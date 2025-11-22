# HOPX_ARTIFACT_ROOT Explained

## What is HOPX_ARTIFACT_ROOT?

`HOPX_ARTIFACT_ROOT` is an environment variable that points to the directory containing built business artifacts (generated code files, build outputs, test suites, etc.) that agents upload to HopX sandbox environments for execution.

## Current Configuration

**Location:** `businesses/fully_integrated/latest` (set in `config/production.env`)

This directory should contain the latest generated business artifacts that need to be:
- Built and tested (Builder Agent)
- Quality-assured (QA Agent)  
- Deployed (Deploy Agent)

## How It Works

1. **Builder Agent**: After generating code, collects all files from `HOPX_ARTIFACT_ROOT` and uploads to HopX for building (`npm install && npm run build`)

2. **QA Agent**: Collects test files and source code from `HOPX_ARTIFACT_ROOT` and uploads to HopX for running tests (`pytest tests/` or `npm test`)

3. **Deploy Agent**: Collects build artifacts from `HOPX_ARTIFACT_ROOT` and uploads to HopX for deployment validation (`vercel --prod --dry-run`)

## Size Limits

Each agent has different size limits when collecting artifacts:

- **Builder Agent**: 20 MB (`max_bytes=20_000_000`)
- **QA Agent**: 10 MB (`max_bytes=10_000_000`)  
- **Deploy Agent**: 25 MB (`max_bytes=25_000_000`)

These limits are defined in:
- `agents/builder_agent.py` line 264
- `agents/qa_agent.py` line 322
- `agents/deploy_agent.py` line 626

## Setup

If the `latest` directory doesn't exist, you can:

1. **Create a symlink** to the most recent business:
   ```bash
   # Windows
   mklink /D businesses\fully_integrated\latest businesses\fully_integrated\saas
   
   # Linux/Mac
   ln -s businesses/fully_integrated/saas businesses/fully_integrated/latest
   ```

2. **Or set it to a specific business directory**:
   ```env
   HOPX_ARTIFACT_ROOT=businesses/fully_integrated/saas/my-app
   ```

3. **Check directory size**:
   ```bash
   python scripts/check_artifact_root.py
   ```

## Adjusting Size Limits

If your artifacts exceed the limits, adjust `max_bytes` in the respective agent files:

```python
# In agents/builder_agent.py
return collect_directory_payload(root, max_bytes=30_000_000)  # 30 MB

# In agents/qa_agent.py  
return collect_directory_payload(root, max_bytes=15_000_000)  # 15 MB

# In agents/deploy_agent.py
return collect_directory_payload(root, max_bytes=50_000_000)  # 50 MB
```

## Directory Structure Example

```
businesses/fully_integrated/latest/
├── package.json
├── tsconfig.json
├── src/
│   ├── components/
│   ├── pages/
│   └── utils/
├── tests/
│   └── *.test.ts
├── .next/          # Build outputs (for deploy)
└── dist/           # Build outputs (for deploy)
```

## Related Files

- `infrastructure/hopx_agent_adapter.py` - Contains `collect_directory_payload()` function
- `agents/builder_agent.py` - Uses artifact root for building
- `agents/qa_agent.py` - Uses artifact root for testing
- `agents/deploy_agent.py` - Uses artifact root for deployment

