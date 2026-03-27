/*
 *   Copyright (c) 2026 Janic Bellmann
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  IS_DEBUG,
  MAX_CONCURRENT_SLICES,
  PORT,
  QUEUE_IDLE_POLL_MS,
} from "./constants";
import { sendReport, withReport } from "./functions";
import { checkFileSize } from "./functions/check-file-size";
import { downloadFile } from "./functions/download-file";
import { readLastBytes } from "./functions/read-last-bytes";
import type { SliceRequest } from "./validations";
import { SliceRequestSchema } from "./validations";

const queue = new Map<string, SliceRequest>();
/** Keys currently being sliced (queue entry is removed at start; without this, duplicates slip in mid-slice). */
const inFlight = new Set<string>();

Bun.serve({
  port: PORT,
  routes: {
    "/slice": {
      GET: async (req) => {
        const searchParams = new URL(req.url).searchParams;

        const {
          data: input,
          success,
          error,
        } = SliceRequestSchema.safeParse(Object.fromEntries(searchParams));

        if (!success) {
          return Response.json(
            {
              error: true,
              code: "BAD_REQUEST",
              message: error.message,
            },
            { status: 400 },
          );
        }

        const key = [
          input.url,
          input.layer_height,
          input.fill_density,
          input.fill_pattern,
          input.filament_density,
          input.filament_cost,
          input.support_enable,
        ].join(":");

        if (queue.has(key) || inFlight.has(key)) {
          return Response.json(
            {
              error: false,
              message: "Slice request already in queue or processing.",
            },
            { status: 200 },
          );
        }

        queue.set(key, input);

        return Response.json(
          {
            error: false,
            message: "Slice request received.",
          },
          { status: 200 },
        );
      },
    },
  },
});

const runSliceJob = async (key: string, request: SliceRequest) => {
  let workDirPath: string | null = null;
  try {
    await withReport(() => checkFileSize(request.url), {
      reportTo: request.report_to,
      error: (error) => ({
        type: "error",
        code: "FILE_TOO_LARGE",
        message: error.message,
      }),
    });

    workDirPath = await mkdtemp(join(tmpdir(), "fastslice-"));

    const destination = join(workDirPath, "Model.stl");
    await withReport(
      () =>
        downloadFile({
          url: request.url,
          destination,
        }),
      {
        reportTo: request.report_to,
        error: (error) => ({
          type: "error",
          code: "FILE_DOWNLOAD_FAILED",
          message: error.message,
        }),
      },
    );

    const proc = Bun.spawn(
      [
        "superslicer",
        "-s",
        "Model.stl",
        "--layer-height",
        `${request.layer_height}`,
        "--fill-density",
        `${request.fill_density}`,
        "--fill-pattern",
        request.fill_pattern,
        "--filament-density",
        `${request.filament_density}`,
        "--filament-cost",
        `${request.filament_cost}`,
        ...(request.support_enable
          ? ["--supports-enable", "--support-material"]
          : []),
        "-o",
        "Model.gcode",
      ],
      {
        cwd: workDirPath,
        stderr: "pipe",
        stdout: "pipe",
        stdin: "ignore",
        signal: AbortSignal.timeout(120_000),
      },
    );

    if (IS_DEBUG && proc.stdout) {
      const reader = proc.stdout.getReader();
      let result = await reader.read();
      while (!result.done) {
        console.debug(new TextDecoder().decode(result.value));
        result = await reader.read();
      }
    }

    const exitCode = await proc.exited;
    const gcode = Bun.file(join(workDirPath, "Model.gcode"));
    if (0 !== exitCode || !(await gcode.exists())) {
      await sendReport(request.report_to, {
        type: "error",
        code: "SLICING_FAILED",
        message: `Failed to slice: ${exitCode}, Output: ${proc.stdout.locked ? await proc.stdout.text() : "locked"}, Error: ${await proc.stderr.text()}`,
      });
    }

    const lastBytes = await readLastBytes(
      join(workDirPath, "Model.gcode"),
      64 * 1024,
    );
    const extract = (re: RegExp) => Number(lastBytes.match(re)?.[1] || 0);

    await sendReport(request.report_to, {
      type: "success",
      data: {
        filamentUsed: extract(/filament used \[mm\] = ([\d.]+)/),
        filamentUsedCm3: extract(/filament used \[cm3\] = ([\d.]+)/),
        totalFilamentUsed: extract(/total filament used \[g\] = ([\d.]+)/),
        totalFilamentCost: extract(/total filament cost = ([\d.]+)/),
        totalLayersCount: extract(/total layers count = (\d+)/),
      },
    });
  } catch (error) {
    console.error(error);
  } finally {
    inFlight.delete(key);
    if (workDirPath) {
      await rm(workDirPath, { recursive: true, force: true });
    }
  }
};

const processQueue = async () => {
  const running = new Set<Promise<void>>();

  while (true) {
    // Start as many queued jobs as we have slots (each finish triggers Promise.race → loop again).
    while (queue.size > 0 && running.size < MAX_CONCURRENT_SLICES) {
      const next = queue.entries().next();
      if (next.done) {
        break;
      }
      const [key, request] = next.value;
      queue.delete(key);
      inFlight.add(key);
      const job = runSliceJob(key, request);
      running.add(job);
      void job
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          running.delete(job);
        });
    }

    if (running.size > 0) {
      await Promise.race(running);
    } else {
      await new Promise((resolve) => setTimeout(resolve, QUEUE_IDLE_POLL_MS));
    }
  }
};

console.log(`> Worker ${process.pid} listening on port ${PORT}`);

await processQueue();
