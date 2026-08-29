import type { Mongoose } from "mongoose";

declare global {
  var __mongoose:
    | {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      }
    | undefined;
}

export {};
