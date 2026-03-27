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
   * Fill density.
   * Must be between 0 and 1.
   */
  fill_density: z.coerce.number().min(0).max(1),
  /**
   * Whether to enable support structures.
   * Default is false.
   */
  support_enable: z.preprocess(
    (val) => ("boolean" === typeof val ? val : "true" === val),
    z.boolean(),
  ),
  /**
   * URL to send the report to.
   * Must be a publically accessible URL.
   */
  report_to: z.url(),
  // Printer specific settings
  fill_pattern: z
    .enum(["grid", "rectilinear", "monotonic"])
    .optional()
    .default("grid"),
  /**
   * Filament density in grams per cubic millimeter.
   * Used to calculate the total filament cost.
   */
  filament_density: z.coerce.number().min(0).optional().default(0),
  /**
   * Filament cost in euros per kilogram.
   * Used to calculate the total filament cost.
   */
  filament_cost: z.coerce.number().min(0).optional().default(0),
});

export type SliceRequest = z.infer<typeof SliceRequestSchema>;
