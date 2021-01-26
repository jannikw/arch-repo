
declare module "simple-zstd" {
  import * as stream from "stream";
  import { SpawnOptions } from "child_process";

  export function ZSTDCompress(
    compLevel?: number,
    spawnOptions?: SpawnOptions
  ): stream.Writable;
  export function ZSTDDecompress(spawnOptions?: SpawnOptions): stream.Readable;
  export function ZSTDDecompressMaybe(
    spawnOptions?: SpawnOptions
  ): stream.Readable;
}
