# DoubleZero Topology

[![CI](https://github.com/malbeclabs/doublezero-topology/actions/workflows/ci.yml/badge.svg)](https://github.com/malbeclabs/doublezero-topology/actions/workflows/ci.yml)

## Using Docker (Recommended)

```bash
docker compose up -d --build
```

## Using pnpm (Development)

```bash
# Install dependencies
pnpm install

# Run tests, build, and start dev server
pnpm test && pnpm build && pnpm dev
```

Navigate to: http://localhost:3000

## Usage

1. Navigate to the Upload page
2. Upload topology JSON files:
   - Snapshot JSON (~56 MB): find these on `do-mn-rewards1:/var/lib/doublezero-contributor-rewards/snapshots`
   - IS-IS database JSON (~877 KB): do something like `show isis database detail | json` on a DZD
3. View results on the Map, Links, or Results pages

## Caveats

- Currently everything is driven manually via the file uploads
- At some point we'll have "auto" loading via some public S3 buckets
