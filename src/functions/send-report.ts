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

import z from "zod";
import { IS_DEBUG } from "../constants";
import type { SliceRequest } from "../validations";
import { retry } from "./retry";

const ReportDataErrorSchema = z.object({
  type: z.literal("error"),
  code: z.enum(["FILE_TOO_LARGE", "FILE_DOWNLOAD_FAILED", "SLICING_FAILED"]),
  message: z.string(),
});

const ReportDataSuccessSchema = z.object({
  type: z.literal("success"),
  data: z.object({
    filamentUsed: z.number(),
    filamentUsedCm3: z.number(),
    totalFilamentUsed: z.number(),
    totalFilamentCost: z.number(),
    totalLayersCount: z.number(),
  }),
});

type ReportDataError = z.infer<typeof ReportDataErrorSchema>;
type ReportDataSuccess = z.infer<typeof ReportDataSuccessSchema>;

const ReportDataSchema = z.discriminatedUnion("type", [
  ReportDataErrorSchema,
  ReportDataSuccessSchema,
]);

type ReportData = z.infer<typeof ReportDataSchema>;

export const sendReport = async (
  reportTo: SliceRequest["report_to"],
  report: ReportData,
): Promise<void> => {
  if (IS_DEBUG) {
    console.debug(`> Sending report to ${reportTo}: ${JSON.stringify(report)}`);
  }

  await retry(async () => {
    const response = await fetch(reportTo, {
      method: "POST",
      body: JSON.stringify(report),
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send slicing report to ${reportTo}: ${response.statusText}`,
      );
    }
  });
};

type WithReportOptions<T> = {
  reportTo: SliceRequest["report_to"];
  success?: ReportDataSuccess | ((data: T) => ReportDataSuccess) | null;
  error?: ReportDataError | ((error: Error) => ReportDataError) | null;
};

export const withReport = async <T>(
  fn: () => Promise<T>,
  options: WithReportOptions<T>,
): Promise<T> => {
  const { reportTo, success, error } = options;

  const reportFn = sendReport.bind(null, reportTo);

  try {
    const result = await fn();

    if (success) {
      void reportFn("function" === typeof success ? success(result) : success);
    }

    return result;
  } catch (originalError) {
    if (error) {
      void reportFn(
        "function" === typeof error ? error(originalError as Error) : error,
      );
    }

    throw originalError;
  }
};
