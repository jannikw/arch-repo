import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { join } from "path";
import * as io from "@actions/io";
import {
  checkFileExists,
  getDirFiles,
  getDirSubdirs,
  requireEnv,
} from "../common/utils";

const workspace = requireEnv("GITHUB_WORKSPACE");
const artifactsDir = join(
  workspace,
  core.getInput("artifacts", { required: true })
);
const repositoryDir = join(
  workspace,
  core.getInput("repository", { required: true })
);

action().catch((error) => {
  core.setFailed(error.message);
});

async function action() {
  if (!(await checkFileExists(artifactsDir))) {
    core.info("no artifacts to upload");
    return;
  }

  const paths: string[] = [];
  for (const artifact of await getDirSubdirs(artifactsDir)) {
    core.info(`checking in ${artifact}`);
    for (const artifactFile of await getDirFiles(
      join(artifactsDir, artifact)
    )) {
      const path = join(artifactsDir, artifact, artifactFile);
      core.info(`found package at ${path}`);
      paths.push(path);
    }
  }

  core.info(`collected ${paths.length} files for moving to repository...`);

  for (const path of paths) {
    core.info(`moving "${path} to repository`);
    await io.mv(path, repositoryDir, { force: true });
  }

  // TODO: move pushing here from workflow
}
