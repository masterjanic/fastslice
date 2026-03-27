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

import { open } from "node:fs/promises";

export const readLastBytes = async (path: string, bytes = 64 * 1024) => {
  const file = await open(path, "r");

  try {
    const { size } = await file.stat();

    const start = Math.max(0, size - bytes);
    const length = size - start;

    const buffer = Buffer.alloc(length);

    await file.read(buffer, 0, length, start);

    return buffer.toString("utf-8");
  } finally {
    await file.close();
  }
};
