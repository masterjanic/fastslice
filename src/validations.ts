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

import * as z from "zod";

export const SliceRequestSchema = z.object({
  /**
   * URL of the STL file to slice.
   * Must be a publically accessible URL.
   */
  url: z.url({
    protocol: /^https$/,
    pattern: /.*\.stl$/,
  }),
  /**
   * Layer height in millimeters.
   * Must be between 0.08 and 0.3 (max nozzle diameter).
   */
  layer_height: z.coerce.number().positive().min(0.08).max(0.3),
  /**
   * Infill percentage.
   * Must be between 1 and 100.
   */
  infill: z.coerce.number().int().positive().min(1).max(100),
  /**
   * Whether to enable support structures.
   * Default is true.
   */
  support_enable: z.coerce.boolean().default(true),
  /**
   * URL to send the report to.
   * Must be a publically accessible URL.
   */
  report_to: z.url(),
});

export type SliceRequest = z.infer<typeof SliceRequestSchema>;
