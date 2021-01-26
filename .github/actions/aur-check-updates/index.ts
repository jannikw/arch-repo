import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { dirname, join } from "path";
import git from "simple-git";
import * as aur from "../common/aur";
import { extractVersionFromSrcInfo, parseSrcInfo } from "../common/arch";
import {
  parseVersion,
  versionString,
  compareVersions,
} from "../common/version";
import { checkFileExists, getDirSubdirs, requireEnv } from "../common/utils";

const token = core.getInput("token", { required: true });
const workspace = requireEnv("GITHUB_WORKSPACE");

const octokit = github.getOctokit(token);
const packagesDir = join(
  workspace,
  core.getInput("packages", { required: true })
);

action().catch((error) => {
  core.setFailed(error.message);
});

async function action() {
  const gitRepo = git(packagesDir);
  core.info("fetching all branches");
  await gitRepo.fetch();

  core.info("checking for issues of not found packages");
  const notFoundPackageIssueTitles = await octokit.issues
    .listForRepo({
      ...github.context.repo,
      state: "open",
      creator: "app/github-actions",
      labels: "not found",
    })
    .then((response) => response.data.map((issue) => issue.title));

  for (const packageName of await getDirSubdirs(packagesDir)) {
    const srcInfoPath = join(packagesDir, packageName, ".SRCINFO");
    // TODO: Extend when also supporting other sources than AUR
    if (!(await checkFileExists(srcInfoPath))) {
      core.info(
        `skipping directory "${packageName}" as it does not contain a .SRCINFO file`
      );
      continue;
    }

    const skipFilePath = join(packagesDir, packageName, ".skipaur");
    if (await checkFileExists(skipFilePath)) {
      core.info(`Skipping checking for AUR updates for package ${packageName} as it contains a skip marker`);
      continue;
    }

    const srcInfo = await parseSrcInfo(
      await fs.promises.readFile(srcInfoPath, { encoding: "utf-8" })
    );
    const version = extractVersionFromSrcInfo(srcInfo);
    const aurInfos = await aur.info([packageName]);

    if (aurInfos.length == 0) {
      // TODO: package no longer on AUR?
      // TODO: Create issue with report
      core.error(`package ${packageName} cannot be found on AUR!`);
      const title = `AUR Package ${packageName} not found`;

      if (notFoundPackageIssueTitles.find((t) => title === t) !== undefined) {
        core.info("issue for not found package already exists");
        continue;
      }

      core.info("creating issue for not found package");
      await octokit.issues.create({
        ...github.context.repo,
        title,
        labels: ["not found"],
        body: [
          `Could not check for an updated version of package ${packageName} as it the package was not found on the AUR.`,
          "",
          "Close this issue if you think the problem has been resolved and updates should be checked for again.",
        ].join("\n"),
      });

      continue;
    }

    const aurPackageInfo = aurInfos[0];
    const aurVersion = parseVersion(aurPackageInfo.Version);

    if (compareVersions(aurVersion, version) == ">") {
      core.info(
        `update available for package ${packageName}: ${versionString(
          version
        )} => ${aurPackageInfo.Version}`
      );

      const branch = `repo-bot/update/${packageName}`;

      try {
        const content = await gitRepo.catFile([
          "--textconv",
          `origin/${branch}:${packageName}/.SRCINFO`,
        ]);
        const existingSrcInfo = parseSrcInfo(content);
        const existingUpdateVersion = extractVersionFromSrcInfo(
          existingSrcInfo
        );

        if (compareVersions(existingUpdateVersion, aurVersion) === "=") {
          core.info(
            `an update to version ${aurPackageInfo.Version} already exists, skipping`
          );
          continue;
        }
      } catch (err) {
        core.info("no existing update found");
      }

      let baseBranch = `repo-bot/update/${packageName}`;
      let newBranch = false;
      try {
        core.info(`checking for existing update branch named ${branch}`);
        await gitRepo.checkout(branch);
      } catch (err) {
        core.info("found no existing update branch, basing on main");
        baseBranch = "main";
        newBranch = true;
        await gitRepo.checkoutBranch(branch, baseBranch);
      }

      core.info("downloading files for package");
      const files = await aur.downloadPackageFiles(aurPackageInfo.URLPath);
      // TODO: Maybe rebase on main

      await gitRepo.raw("rm", "-r", packageName);
      await Promise.all(
        files.map(async (f) => {
          core.info(`writing package file ${f.path}`);
          const path = join(packagesDir, f.path);
          await fs.promises.mkdir(dirname(path), { recursive: true });
          await fs.promises.writeFile(
            join(packagesDir, f.path),
            f.data,
            "binary"
          );
        })
      );

      core.info("adding files to git and committing update");
      await gitRepo.add(files.map((f) => join(packagesDir, f.path)));
      await gitRepo.addConfig("user.name", "GitHub Actions");
      await gitRepo.addConfig("user.email", "actions@github.com");
      await gitRepo.commit(
        `Update ${packageName} to ${aurPackageInfo.Version}`
      );

      await gitRepo.push("origin", branch);

      const title = `Update ${packageName} to ${aurPackageInfo.Version}`;
      const body = [
        `This updates package \`${packageName}\``,
        "",
        `Version: \`${aurPackageInfo.Version}\``,
      ].join("\n");

      let updated = false;
      core.info("looking for existing pull request to update");
      const pulls = await octokit.pulls.list({
        ...github.context.repo,
        head: branch,
        state: "open",
      });
      for (const pull of pulls.data) {
        // TODO: Check for user here?
        // TODO: Possibly add more info here
        core.info(`updating existing pull request #${pull.number}`);
        await octokit.issues.update({
          ...github.context.repo,
          issue_number: pull.number,
          body,
          title,
        });

        await octokit.issues.createComment({
          ...github.context.repo,
          issue_number: pull.number,
          body: `Updated pull request for version \`${aurPackageInfo.Version}\`.`,
        });

        updated = true;
        break;
      }

      if (!updated) {
        core.info("create new pull request");
        await octokit.pulls.create({
          ...github.context.repo,
          head: `refs/heads/${branch}`,
          base: `refs/heads/main`,
          title,
          body,
        });
      }
    } else {
      core.info(`package ${packageName} is up to date with AUR`);
    }
  }
}
