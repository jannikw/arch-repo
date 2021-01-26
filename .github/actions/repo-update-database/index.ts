import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { join } from "path";
import { getDirFiles, requireEnv, tryUnlink } from "../common/utils";
import { initialize } from "./database";


const workspace = requireEnv("GITHUB_WORKSPACE");
const repositoryDir = join(workspace, core.getInput("repository"));
const repositoryName = core.getInput("name", { required: true });

action().catch((error) => {
  core.setFailed(error.message);
});

// TODO: Sign packages

async function action() {
  core.info("preparing database");
  const { addPackage, writeDatabase } = await initialize();

  for (const file of await getDirFiles(repositoryDir)) {
    if (
      !file.endsWith(".sig") &&
      /^([a-zA-Z0-9@._+\-]+)-((?:\d*\:)?[^-]+(?:-.*)?)-(x86_64|any)(\.pkg.tar(?:\.\w+)+)$/.exec(
        file
      )
    ) {
      core.info(`adding package in file ${file}`);
      await addPackage(join(repositoryDir, file));
    } else {
      core.info(`skipping file ${file}`);
    }
  }

  const compression = ".zst";
  core.info("writing database");
  for (const type of ["db", "files"]) {
    const name = repositoryName + "." + type;
    const databasePath = join(repositoryDir, name + compression);
    const databaseLink = join(repositoryDir, name);

    core.info(`writing database ${name}`);
    await writeDatabase(databasePath, type === "files");

    core.debug("symlink database file")
    await tryUnlink(databaseLink);
    await fs.promises.symlink(name + compression, databaseLink);

    // TODO: signing stuff
    // await tryUnlink(databasePath + ".sig");
    // await tryUnlink(databaseLink + ".sig");
    // await signing?.signFile(databasePathTmp);

    // Rename .tmp file to real database file, possibly replacing any existing
    // signing && (await fs.promises.rename(databasePathTmp + ".sig", databasePath + ".sig"));

    // signing && (await fs.promises.symlink(name + compression + ".sig", databaseLink + ".sig"));
  }
}
