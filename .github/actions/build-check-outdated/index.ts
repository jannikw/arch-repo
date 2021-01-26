import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { join } from "path";
import {
  extractVersionFromPkgInfo,
  extractVersionFromSrcInfo,
  parsePkgInfo,
  parseSrcInfo,
} from "../common/arch";
import { compareVersions, Version, versionString } from "../common/version";
import { getDirSubdirs, requireEnv } from "../common/utils";
import { checkFileExists, execFile, getDirFiles } from "../common/utils";

const workspace = requireEnv("GITHUB_WORKSPACE");
const packagesDir = join(
  workspace,
  core.getInput("packages", { required: true })
);
const repositoryDir = join(
  workspace,
  core.getInput("repository", { required: true })
);

action().catch((error) => {
  core.setFailed(error.message);
});

async function action() {
  core.info("checking for built packages in repository");
  const builtPackages = await getBuiltPackageVersions(repositoryDir);

  core.info("determine outdated packages");
  const packagesToBuild: string[] = [];
  for (const packageDir of await getDirSubdirs(packagesDir)) {
    const srcInfoPath = join(packagesDir, packageDir, ".SRCINFO");

    // TODO: Also check for PKGBUILD?
    if (await checkFileExists(srcInfoPath)) {
      const content = await fs.promises.readFile(srcInfoPath, {
        encoding: "utf-8",
      });
      const srcInfo = parseSrcInfo(content);
      const version = extractVersionFromSrcInfo(srcInfo);
      const pkgName = srcInfo.pkgbase.name;
      const builtVersion = builtPackages[pkgName];

      const comparison =
        builtVersion === undefined
          ? ">"
          : compareVersions(version, builtVersion);
      const builtVersionStr =
        (builtVersion && versionString(builtVersion)) || "n/a";
      const versionStr = versionString(version);

      if (comparison === "=") {
        core.info(
          `package ${pkgName} in repository is up to date: ${builtVersionStr} => ${versionStr}`
        );
      } else if (comparison === ">") {
        core.info(
          `package "${pkgName}" in repository is outdated: ${builtVersionStr} => ${versionStr}`
        );

        packagesToBuild.push(packageDir);
      } else if (comparison == "<") {
        core.warning(
          `package ${pkgName} is newer in repository! ${builtVersionStr} => ${versionStr}`
        );
      }
    }
  }

  core.setOutput("outdated-package", packagesToBuild);
}

async function getBuiltPackageVersions(
  packageDir: string
): Promise<{ [name: string]: Version | undefined }> {
  const packages: { [name: string]: Version | undefined } = {};
  for (const fileName of await getDirFiles(packageDir)) {
    if (
      !fileName.endsWith(".sig") &&
      /^([a-zA-Z0-9@._+\-]+)-((?:\d*\:)?[^-]+(?:-.*)?)-(x86_64|any)(\.pkg.tar(?:\.\w+)+)$/.exec(
        fileName
      )
    ) {
      const pkgPath = join(packageDir, fileName);
      const { stdout } = await execFile("bsdtar", [
        "-xOqf",
        pkgPath,
        ".PKGINFO",
      ]);
      const pkginfo = parsePkgInfo(stdout);
      const version = extractVersionFromPkgInfo(pkginfo);
      const name = pkginfo.pkgname;

      core.info(`found package ${name} at version ${pkginfo.pkgver}`);

      // Skip version if a new one was already collected
      const current = packages[name];
      if (current !== undefined) {
        if (compareVersions(current, version) === ">") {
          continue;
        }
      }
      packages[name] = version;
    }
  }

  return packages;
}