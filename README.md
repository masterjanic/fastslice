# fastslice

Small **Bun** HTTP worker that accepts slice jobs over the network: it downloads an **HTTPS** `.stl` URL, runs **SuperSlicer** headlessly, then **POSTs** a JSON report to your callback URL.

## Demo

<video src="https://raw.githubusercontent.com/masterjanic/fastslice/main/.github/assets/demo.webm" controls playsinline muted width="100%"></video>

## What you need

- **Bun** (see `package.json` / `bun.lock`)
- **SuperSlicer** on `PATH` when running locally (the Docker image installs it for you)

## Run it

**Local**

```bash
bun install
bun run start
```

**Docker** (SuperSlicer included; see `docker-compose.yml` for example env)

```bash
docker compose up --build
```

Default listen port is **3000** unless you set `PORT`.

## API

### `GET /slice`

Enqueue one job. All parameters are **query string** values (URL-encoded where needed).

| Parameter        | Required | Description                                                                |
| ---------------- | -------- | -------------------------------------------------------------------------- |
| `url`            | yes      | HTTPS URL to the STL file; path must end in `.stl`.                        |
| `layer_height`   | yes      | Layer height in mm; **0.08–0.3**.                                          |
| `infill`         | yes      | Infill **1–100** (percent).                                                |
| `support_enable` | no       | Supports on/off; coerced as boolean, default **true**.                     |
| `report_to`      | yes      | URL that will receive the **POST** JSON result (see below).                |

**Responses**

- **200** — Job accepted (`error: false`, `message: "Slice request received."`), or the same job is already queued/processing (`message` explains deduplication).
- **400** — Validation failed (`error: true`, `code: "BAD_REQUEST"`, `message` from schema).

Duplicate detection uses the tuple `url` + `layer_height` + `infill` + `support_enable`.

**Example**

```bash
curl -G 'http://localhost:3000/slice' \
  --data-urlencode 'url=https://example.com/model.stl' \
  --data-urlencode 'layer_height=0.2' \
  --data-urlencode 'infill=20' \
  --data-urlencode 'support_enable=true' \
  --data-urlencode 'report_to=https://your.app/hooks/slice-result'
```

### Callback (`POST` to `report_to`)

`Content-Type: application/json`.

- **Success** — `{ "type": "success", "data": { "filamentUsed", "filamentUsedCm3", "totalFilamentUsed", "totalFilamentCost", "totalLayersCount" } }` (numbers parsed from the end of the G-code summary).
- **Error** — `type` is `"error"`, `code` is `FILE_TOO_LARGE`, `FILE_DOWNLOAD_FAILED`, or `SLICING_FAILED`, and `message` explains the failure.

## Environment variables

| Variable                | Default               | Meaning                                                                  |
| ----------------------- | --------------------- | ------------------------------------------------------------------------ |
| `PORT`                  | `3000`                | HTTP listen port.                                                        |
| `MAX_FILE_SIZE_BYTES`   | `314572800` (300 MiB) | Reject STL if `HEAD` `Content-Length` exceeds this.                      |
| `MAX_CONCURRENT_SLICES` | `4`                   | Parallel SuperSlicer processes (minimum **1**).                          |
| `QUEUE_IDLE_POLL_MS`    | `1000`                | Sleep when the queue is empty (worker poll interval).                    |
| `DEBUG`                 | unset                 | Set to `true` for extra logs (e.g. SuperSlicer stdout, report payloads). |

## Contributing

- [Issues](https://github.com/masterjanic/fastslice/issues) for bugs
- [Pull requests](https://github.com/masterjanic/fastslice/pulls) for fixes and features

## License

[GNU Affero General Public License v3.0 (AGPLv3)](https://opensource.org/license/agpl-v3) — see [LICENSE.md](LICENSE.md).
