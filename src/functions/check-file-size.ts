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

import { IS_DEBUG, MAX_FILE_SIZE_BYTES } from "../constants";
import { retry } from "./retry";

export const checkFileSize = async (url: string) => {
  const fileSizeBytes = await retry(async () => {
    if (IS_DEBUG) {
      console.debug(`> Checking file size of ${url}`);
    }

    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to check file size: ${response.statusText}`);
    }

    return Number(response.headers.get("content-length") || 0);
  });

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size ${fileSizeBytes} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes.`,
    );
  }
};
