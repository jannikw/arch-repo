import got from "got";
import { URL, URLSearchParams } from "url";
import http from "http";
import https from "https";
import { withFile } from "tmp-promise";
import decompress from "decompress";
import * as fs from "fs";

type Response<TType extends string, TData> = {
    version: number;
    resultcount: number;
} & (
    | {
          type: "error";
          results: [];
          error: string;
      }
    | {
          type: TType;
          results: TData[];
      }
);

export interface SearchData {
    ID: number;
    Name: string;
    PackageBaseID: number;
    PackageBase: string;
    Version: string;
    Description: string;
    URL: string;
    NumVotes: number;
    Popularity: number;
    OutOfDate: number | null;
    Maintainer: string | null;
    FirstSubmitted: number;
    LastModified: number;
    URLPath: string;
}

export type InfoData = SearchData & {
    Depends: string[];
    MakeDepends: string[];
    OptDepends: string[];
    CheckDepends: string[];
    Conflicts: string[];
    Provides: string[];
    Replaces: string[];
    Groups: string[];
    License: string[];
    Keywords: string[];
};

const aurBaseUrl = "https://aur.archlinux.org/rpc/";
const aurVersion = "5";
const requestUrlMaxLength = 4443;

async function request<TType extends string, TData>(url: URL) {
    const response = await got(url).json<Response<TType, TData>>();

    return response;
}

type SearchBy = "name" | "name-desc" | "maintainer" | "depends" | "makedepends" | "optdepends" | "checkdepends";

export async function search(by: SearchBy, arg: string): Promise<SearchData[]> {
    const params = new URLSearchParams([
        ["v", aurVersion],
        ["type", "search"],
        ["by", by],
        ["arg", arg],
    ]);
    const url = new URL(aurBaseUrl);
    url.search = params.toString();

    const response = await request<"search", SearchData>(url);

    if (response.type === "error") {
        throw Error(response.error);
    }

    return response.results;
}

export async function info(args: string[]): Promise<InfoData[]> {
    const params = new URLSearchParams([
        ["v", aurVersion],
        ["type", "info"],
        ...(<[string, string][]>args.map((arg) => ["arg[]", arg])),
    ]);
    const url = new URL(aurBaseUrl);
    url.search = params.toString();

    const response = await request<"multiinfo", InfoData>(url);

    if (response.type === "error") {
        throw Error(response.error);
    }

    return response.results;
}

export async function downloadArchive(
    urlSuffix: string
): Promise<http.IncomingMessage> {
    const url = "https://aur.archlinux.org"  + urlSuffix;
    return new Promise((resolve, reject) => {
        if (url.startsWith("http:")) {
            http.get(url, resolve).on("error", reject);
        } else {
            https.get(url, resolve).on("error", reject);
        }
    });
}

interface File {
  path: string;
  data: Buffer;
  // TODO: Maybe add file mode as well?
}

export async function downloadPackageFiles(urlSuffix: string): Promise<File[]> {
  const response = await downloadArchive(urlSuffix);

  // TODO: Destroy response on error?
  if (response.statusCode !== 200) {
    throw new Error(`failed to download file ...${urlSuffix}`);
  }

  return withFile<File[]>((tmpFile) => {
    return new Promise((resolve) => {
      const file = fs.createWriteStream(tmpFile.path);
      file.on("open", () => {
        response.pipe(file);
        response.on("end", async () => {
          const archiveFiles = await decompress(tmpFile.path);
          resolve(
            archiveFiles
              .filter((f) => f.type === "file")
              .map((f) => ({ path: f.path, data: f.data }))
          );
        });
      });
    });
  });
}