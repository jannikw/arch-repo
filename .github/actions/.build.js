const ncc = require("@vercel/ncc");
const fs = require("fs");
const { dirname, join } = require("path");

async function main() {
  const entries = await fs.promises.readdir(__dirname, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        const actionFile = join(__dirname, entry.name, "action.yml");
        const sourceFile = join(__dirname, entry.name, "index.ts");
        const outputFile = join(__dirname, entry.name, "dist", "index.js");

        try {
          await fs.promises.access(actionFile, fs.constants.F_OK);
          await fs.promises.access(sourceFile, fs.constants.F_OK);
        } catch (err) {
          console.log(
            `directory "${entry.name} contains no action.yml and index.ts, skipping...`
          );
          return;
        }

        console.log(`building index.ts in "${entry.name}"...`);
        const { code } = await ncc(sourceFile);
        await fs.promises.mkdir(dirname(outputFile), { recursive: true });
        await fs.promises.writeFile(outputFile, code);
      }
    })
  );
}

main().catch((err) => {
  console.error("Failed to build actions: ", err);
  process.exit(1);
});
