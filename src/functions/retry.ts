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

export const retry = async <T>(fn: () => Promise<T>, attempts = 3) => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      if (IS_DEBUG) {
        console.debug(
          `> Attempting to call ${fn.name || "function"} (attempt ${i + 1} of ${attempts})`,
        );
      }

      return await fn();
    } catch (e) {
      if (IS_DEBUG) {
        console.debug(
          `> Attempt to call ${fn.name || "function"} failed (attempt ${i + 1} of ${attempts}): ${e}`,
        );
      }

      lastError = e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw lastError;
};
