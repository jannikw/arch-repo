import * as core from "@actions/core";
import * as github from "@actions/github";
import { requireEnv } from "../common/utils";

const token = core.getInput("token", { required: true });
const octokit = github.getOctokit(token);
const packageName = core.getInput("package", { required: true });

octokit.log.debug = console.log;
octokit.log.error = console.log;
octokit.log.info = console.log;
octokit.log.warn = console.log;

action().catch((error) => {
  core.setFailed(error.message);
});

async function action() {
  const title = `Building package ${packageName} failed`;
  const label = "build error";

  core.debug("checking for issues");
  const issues = await octokit.issues.listForRepo({
    ...github.context.repo,
    state: "open",
    creator: "app/github-actions",
    labels: label,
  });

  core.info(`found ${issues.data.length} issues to check`);

  core.info(`filtering issues to match title "${title}"`);
  const issue = issues.data.find((issue) => {
    core.debug(`checking issue: "${issue.title}"`);
    if (issue.title === title) {
      return true;
    }

    return false;
  });

  if (issue !== undefined) {
    core.info(
      `found issue #${issue.number} for build error of package ${packageName}`
    );
    core.setOutput("exists", "true");
  } else {
    core.setOutput("exists", "false");
  }
}
