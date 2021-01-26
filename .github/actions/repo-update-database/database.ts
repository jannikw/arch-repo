import { parsePkgInfo, PkgInfo } from "../common/arch";
import fs from "fs";
import { join, basename, parse, dirname, resolve } from "path";
import { promisify } from "util";
import child_process from "child_process";
import { hashFile } from "../common/hash";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as tar from "tar-stream";
import { ZSTDCompress } from "simple-zstd";

const execFile = promisify(child_process.execFile);
const UNIXZERO = new Date(new Date().getTimezoneOffset() * -1);

interface Package {
  pkgInfo: PkgInfo;
  fileName: string;
  compressedSize: number;
  md5sum: string;
  sha256sum: string;
  pgpSignature: string;
  lastModifiedTime: Date;
}

async function getPkgInfoFromFile(path: string): Promise<PkgInfo> {
  const { stdout } = await execFile("bsdtar", ["-xOf", path, ".PKGINFO"], {
    maxBuffer: 1024 * 1024,
  });
  return parsePkgInfo(stdout);
}

async function writePkgDescFile(workDir: string, pkg: Package) {
  const { pkgname: name, pkgver: version } = pkg.pkgInfo;
  const path = join(workDir, `${name}-${version}`, "desc");
  await fs.promises.mkdir(dirname(path), { recursive: true });
  const writeStream = fs.createWriteStream(path, { encoding: "utf-8" });

  return await new Promise((resolve, reject) => {
    writeStream.on("error", (err) => {
      reject(err);
    });

    function writeEntry(name: string, ...values: string[]) {
      writeStream.write(`%${name}%\n`);
      values.forEach((value) => writeStream.write(value + "\n"));
      writeStream.write("\n");
    }

    // base information
    writeEntry("FILENAME", pkg.fileName);
    writeEntry("Name", name);
    writeEntry("BASE", pkg.pkgInfo.pkgbase ?? "");
    writeEntry("VERSION", version);
    writeEntry("DESC", pkg.pkgInfo.pkgdesc ?? "");
    writeEntry("GROUPS", ...pkg.pkgInfo.group);
    writeEntry("CSIZE", pkg.compressedSize.toFixed());
    writeEntry("ISIZE", pkg.pkgInfo.size ?? "");

    // security attributes
    writeEntry("MD5SUM", pkg.md5sum);
    writeEntry("SHA256SUM", pkg.sha256sum);
    writeEntry("PGPSIG", pkg.pgpSignature);

    writeEntry("URL", pkg.pkgInfo.url ?? "");
    writeEntry("LICENSE", ...pkg.pkgInfo.license);
    writeEntry("ARCH", pkg.pkgInfo.arch ?? "");
    writeEntry("BUILDDATE", pkg.pkgInfo.builddate ?? "");
    writeEntry("PACKAGER", pkg.pkgInfo.packager ?? "");
    writeEntry("REPLACES", ...pkg.pkgInfo.replace);
    writeEntry("CONFLICTS", ...pkg.pkgInfo.conflict);
    writeEntry("PROVIDES", ...pkg.pkgInfo.provide);
    writeEntry("DEPENDS", ...pkg.pkgInfo.depend);
    writeEntry("OPTDEPENDS", ...pkg.pkgInfo.optdepend);
    writeEntry("MAKEDEPENDS", ...pkg.pkgInfo.makedepend);
    writeEntry("CHECKDEPENDS", ...pkg.pkgInfo.checkdepend);

    resolve(path);
  }).finally(() => writeStream.close());
}

async function writePkgFilesFile(
  workDir: string,
  pkg: Package,
  pkgArchive: string
) {
  const { pkgname: name, pkgver: version } = pkg.pkgInfo;
  const path = join(workDir, `${name}-${version}`, "files");
  await fs.promises.mkdir(dirname(path), { recursive: true });
  // TODO: buffer for packages with many files might be to small, switch to streaming the file list
  const { stdout } = await execFile(
    "bsdtar",
    ["--exclude=^.*", "-tf", pkgArchive],
    { maxBuffer: 5 * 1024 * 1024 }
  );
  const files = stdout.trim().split("\n").sort();
  const writeStream = fs.createWriteStream(path, { encoding: "utf-8" });

  return await new Promise<void>((resolve, reject) => {
    writeStream.on("error", (err) => {
      reject(err);
    });

    writeStream.write("%FILES%\n");
    files.forEach((file) => {
      writeStream.write(file + "\n");
    });

    resolve();
  }).finally(() => writeStream.close());
}

export async function initialize() {
  const workDir = await fs.promises.mkdtemp("repository-work");
  const packages = new Map<{ name: string; version: string }, Package>();

  async function addPackage(path: string) {
    core.info(`adding package from ${path}`);
    const fileName = basename(path);
    const stats = await fs.promises.stat(path);
    const pkgInfo = await getPkgInfoFromFile(path);
    const { pkgname: name, pkgver: version } = pkgInfo;
    if (!fileName.startsWith(`${name}-${version}-`)) {
      core.warning(
        `file name of ${name} does not match package info: ${fileName}`
      );
    }

    const pkg = packages.get({ name, version });
    if (pkg === undefined || pkg.lastModifiedTime < stats.mtime) {
      core.info(`package ${name} is new`);
      const md5sum = await hashFile(path, "md5");
      const sha256sum = await hashFile(path, "sha256");

      let pgpSignature = "";
      let signatureBuffer = await fs.promises
        .readFile(path + ".sig")
        .catch((err) => {
          core.debug(`could not read signature for package ${name}`);
          return undefined;
        });
      if (signatureBuffer !== undefined) {
        const pgpSigArmoredPrefix = "BEGIN PGP SIGNATURE";
        // FIXME: not exactly the same behavior as repo-add has, since repo-add uses grep for searching
        if (
          signatureBuffer
            .slice(0, pgpSigArmoredPrefix.length)
            .toString("ascii") === pgpSigArmoredPrefix
        ) {
          throw new Error("cannot use armored signatures");
        }
        pgpSignature = signatureBuffer.toString("base64");
      }

      const updatedPkg = {
        pkgInfo,
        fileName,
        compressedSize: stats.size,
        md5sum,
        sha256sum,
        pgpSignature,
        lastModifiedTime: stats.mtime,
      };
      packages.set({ name, version }, updatedPkg);
      core.debug(`writing desc file for ${name}`);
      await writePkgDescFile(workDir, updatedPkg);
      core.debug(`writing files file for ${name}`);
      await writePkgFilesFile(workDir, updatedPkg, path);

      return true;
    }
    core.info(`package ${name} is already up to date`);
    return false;
  }

  async function removePackage(path: string) {
    const fileName = basename(path);
    // log.info(`removing ${fileName}`);

    let removed = false;
    for (const [name, pkg] of packages) {
      if (pkg.fileName === fileName) {
        const { pkgname: name, pkgver: version } = pkg.pkgInfo;
        const path = join(workDir, `${name}-${version}`);
        await io.rmRF(path);
        packages.delete({ name, version });
        core.info(`removed package ${name} from repository`);
        removed = true;
        break;
      }
    }

    if (!removed) {
      console.warn(`package for ${fileName} not found in repository`);
    }

    return removed;
  }

  async function writeDatabase(path: string, includeFiles: boolean) {
    // Get a sorted list of the files to get a stable order every time
    const files = await (await fs.promises.readdir(workDir)).sort();
    const databaseStream = fs.createWriteStream(path);
    const pack = tar.pack();
    const entryDir = promisify((name: string, cb: tar.Callback) =>
      pack.entry({ name, mtime: UNIXZERO, type: "directory" }, cb)
    );
    const entryFile = promisify(
      (name: string, buffer: Buffer, cb: tar.Callback) =>
        pack.entry({ name, mtime: UNIXZERO, type: "file" }, buffer, cb)
    );
    
    return await new Promise<void>((resolve, reject) => {
      databaseStream.on("error", reject);
      databaseStream.on("open", async () => {
        const compressProcess = child_process.spawn(
          "zstd",
          ["-c", "-z", "-q", "-"],
          {
            stdio: ["pipe", databaseStream, "ignore"],
          }
        );
        pack.pipe(compressProcess.stdin);

        for (const pkgName of files) {
          await entryDir(pkgName);
          await entryFile(
            join(pkgName, "desc"),
            await fs.promises.readFile(join(workDir, pkgName, "desc"))
          );

          if (includeFiles) {
            await entryFile(
              join(pkgName, "files"),
              await fs.promises.readFile(join(workDir, pkgName, "files"))
            );
          }
        }

        pack.finalize();

        compressProcess.on("exit", (code, signal) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `${compressProcess.spawnargs[0]} exited with ${code || signal}`
              )
            );
          }
        });
      });
    }).finally(() => {
      databaseStream.close();
    });
  }

  return {
    addPackage,
    removePackage,
    writeDatabase,
  };
}
