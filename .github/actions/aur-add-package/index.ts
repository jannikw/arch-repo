import * as core from "@actions/core";
import * as github from "@actions/github";
import { EventPayloads } from "@octokit/webhooks";
import { join } from "path";
import * as aur from "../common/aur";
import { checkFileExists, requireEnv } from "../common/utils";

const token = core.getInput("token");
const octokit = github.getOctokit(token);
const workspace = requireEnv("GITHUB_WORKSPACE");

action().catch((error) => {
  core.setFailed(error.message);
});

async function action() {
  if (
    github.context.eventName !== "issues" ||
    github.context.payload.action !== "opened"
  ) {
    throw new Error("action must be triggered by opening an issue");
  }
  const payload = github.context.payload
    .issue as EventPayloads.WebhookPayloadIssuesIssue;
  const issueNumber = payload.number;
  const issueBody = payload.body;

  // TODO: case sensitive
  const pattern = /^\/repo-add-aur-package\s+`?([a-zA-Z0-9_-]+)`?\s*$/gm;
  const match = pattern.exec(issueBody);

  if (!match) {
    core.info("issue did not add a new package");
    return;
  }

  const packageName = match[1];
  const issue = await octokit.issues.update({
    ...github.context.repo,
    issue_number: issueNumber,
    title: `Add package ${packageName}`,
  });
  core.debug(`association of issue author: ${payload.author_association}`);
  if (!["COLLABORATOR", "OWNER"].includes(payload.author_association)) {
    core.warning("issue author is not allowed to add new packages");
    await octokit.issues.createComment({
      ...github.context.repo,
      issue_number: issueNumber,
      body: "You are not allowed to add new packages to the repository.",
    });
    return;
  }

  if (await checkFileExists(join(workspace, packageName))) {
    await octokit.issues.update({
      ...github.context.repo,
      issue_number: issueNumber,
      labels: [...payload.labels, "duplicate"],
    });
    await octokit.issues.createComment({
      ...github.context.repo,
      issue_number: issueNumber,
      body: `There already exists a package named \`${packageName}\` in the repository.`,
    });
    throw new Error(`found directory for package ${packageName}`);
  }

  const aurInfos = await aur.info([packageName]);
  // Exit as we have not found the specified package
  if (aurInfos.length === 0) {
    await octokit.issues.createComment({
      ...github.context.repo,
      issue_number: issueNumber,
      body: `Could not find any package named \`${packageName}\`.`,
    });
    await octokit.issues.update({
      ...github.context.repo,
      issue_number: issueNumber,
      labels: [...issue.data.labels, "not found"],
    });
    throw new Error(`could not find package ${packageName}`);
  }

  const aurPackageInfo = aurInfos[0];

  core.info("checking for existing branch");
  const branch = `repo-bot/add/${packageName}`;
  const branchExists = await octokit.git
    .getRef({
      ...github.context.repo,
      ref: "heads/" + branch,
    })
    .then(() => true)
    .catch(() => false);

  if (branchExists) {
    await octokit.issues.update({
      ...github.context.repo,
      issue_number: issueNumber,
      labels: [...payload.labels, "duplicate"],
    });
    await octokit.issues.createComment({
      ...github.context.repo,
      issue_number: issueNumber,
      body: "There already exists a branch adding the requested package.",
    });
    throw new Error(`found existing branch "${branch}" for package`);
  }

  // TODO: We could commit directly without using the API
  const files = await aur.downloadPackageFiles(aurPackageInfo.URLPath);
  const blobs = await Promise.all(
    files.map((f) =>
      octokit.git.createBlob({
        ...github.context.repo,
        content: f.data.toString("base64"),
        encoding: "base64",
      })
    )
  );

  core.info("getting main ref");
  const head = await octokit.git.getRef({
    ...github.context.repo,
    ref: "heads/main",
  });

  core.info(`create tree with base ${head.data.object.sha}`);
  const tree = await octokit.git.createTree({
    ...github.context.repo,
    tree: blobs.map((blob, i) => ({
      type: "blob",
      mode: "100644",
      path: files[i].path,
      sha: blob.data.sha,
    })),
    base_tree: head.data.object.sha,
  });

  core.info(`committing tree ${tree.data.sha}`);
  const commit = await octokit.git.createCommit({
    ...github.context.repo,
    message: `Add package ${packageName}`,
    tree: tree.data.sha,
    parents: [head.data.object.sha],
  });

  core.info(`create branch for commit ${commit.data.sha}`);
  await octokit.git.createRef({
    ...github.context.repo,
    ref: "refs/heads/" + branch,
    sha: commit.data.sha,
  });

  // TODO: Display more package information, maybe as a table?
  const displayInfo = [`Version: \`${aurPackageInfo.Version}\``];

  // TODO: add user as reviewer?
  const pull = await octokit.pulls.create({
    ...github.context.repo,
    head: "refs/heads/" + branch,
    base: "refs/heads/main",
    title: `Added package ${packageName}`,
    body: [
      `This adds package ${packageName}.`,
      "",
      ...displayInfo,
      "",
      `Fixes #${issueNumber}`,
    ].join("\n"),
  });

  await octokit.issues.createComment({
    ...github.context.repo,
    issue_number: issueNumber,
    body: [
      `Please review #${pull.data.number} to add package \`${packageName}\`.`,
      "",
      ...displayInfo,
    ].join("\n"),
  });
}
