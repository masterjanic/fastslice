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

import { IS_DEBUG } from "../constants";
import { retry } from "./retry";

type DownloadFileOptions = {
  url: string;
  destination: string | URL;
};

const supportedContentType = [
  "model/stl", // official / preferred modern type
  "model/x.stl-ascii", // sometimes used for ASCII STL
  "model/x.stl-binary", // sometimes used for binary STL
  "application/sla", // legacy, from stereolithography
  "application/vnd.ms-pki.stl", // used by some Microsoft tools
  "application/octet-stream", // generic fallback for binary files
  "binary/octet-stream",
];

export const downloadFile = async ({
  url,
  destination,
}: DownloadFileOptions): Promise<void> => {
  await retry(async () => {
    if (IS_DEBUG) {
      console.debug(`> Downloading file from ${url}`);
    }

    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Accept: "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (null === contentType || !supportedContentType.includes(contentType)) {
      throw new Error(
        `Invalid content type: ${contentType}. Expected one of: ${supportedContentType.join(", ")}.`,
      );
    }

    if (null === response.body) {
      throw new Error("Failed to download file: no body");
    }

    await Bun.write(destination, await response.arrayBuffer());
  });
};
