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

/**
 * The port to listen on.
 * Default is 3000.
 */
export const PORT = process.env.PORT || 3000;

/**
 * The maximum file size in bytes for a file to be sliced.
 * Default is 300MB.
 */
export const MAX_FILE_SIZE_BYTES =
  Number(process.env.MAX_FILE_SIZE_BYTES) || 1024 * 1024 * 300;

/**
 * Whether the server is running in debug mode.
 */
export const IS_DEBUG = process.env.DEBUG === "true";

/**
 * How many slice jobs may run at once (each runs SuperSlicer in its own temp dir).
 * Default is 4. Set via `MAX_CONCURRENT_SLICES`.
 */
export const MAX_CONCURRENT_SLICES = Math.max(
  1,
  Number(process.env.MAX_CONCURRENT_SLICES) || 4,
);

/** How long to sleep when the queue is empty and nothing is running (worker poll interval). */
export const QUEUE_IDLE_POLL_MS = Number(process.env.QUEUE_IDLE_POLL_MS) || 1_000;
