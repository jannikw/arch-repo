import fs from "fs";
import crypto from "crypto";

export function hashFile(path: string, algorithm: "md5" | "sha256") : Promise<string> {
    return new Promise((resolve, reject) => {
        const output = crypto.createHash(algorithm);
        const input = fs.createReadStream(path);

        input.on("error", (err) => {
            reject(err);
        });
        output.once("readable", () => {
            resolve(output.read().toString("hex"));
        });
        input.pipe(output);
    });
}