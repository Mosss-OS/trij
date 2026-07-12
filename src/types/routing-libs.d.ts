/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Type declarations for optional routing libraries.
 *
 * These libraries are dynamically imported and may not be installed.
 * If the import fails, the routing engine falls through to the
 * built-in A* implementation.
 */

declare module "graphhopper-js-api-client" {
  export class Graphhopper {
    constructor(options: { key: string; vehicle: string; elevation: boolean });
    route(options: { points: number[][] }): Promise<any>;
  }
}

declare module "osrm" {
  export default class OSRM {
    constructor(options: { paths: any[] });
    route(
      options: {
        coordinates: number[][];
        overview: string;
        geometries: string;
      },
      callback: (error: any, result: any) => void,
    ): void;
  }
}
