import * as core from "@actions/core";
import * as github from "@actions/github";
import { requireEnv } from "../common/utils";

const token = core.getInput("token", { required: true });
const octokit = github.getOctokit(token);
const packageName = core.getInput("package", { required: true });

action().catch((error) => {
  core.setFailed(error.message);
});

async function action() {
  const githubBaseUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}`;
  const pkgBuildUrl = `${githubBaseUrl}/blob/${github.context.sha}/${packageName}/PKGBUILD`;
  const actionRunUrl = `${githubBaseUrl}/actions/runs/${github.context.runId}`;

  const title = `Building package ${packageName} failed`;
  const label = "build error";
  const body = [
    `Building the package ${packageName} failed.`,
    "Please review the error and fix any issues.",
    "As long as this issue is open, the package will not be skipped during building.",
    "",
    `Action run: ${actionRunUrl}`,
    `\`PKGBUILD\` file: ${pkgBuildUrl}`,
  ];

  const issue = await octokit.issues.create({
    ...github.context.repo,
    title,
    body: body.join("\n"),
    labels: [label],
  });

  core.info(
    `created issue #${issue.data.number} for build error of package ${packageName}`
  );
}
