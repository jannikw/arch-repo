// TypeScript implementations of:
// - Parsing of SRCINFO files
// - Parsing of PKGINFO files

import { Version, parseVersion } from "./version";
export interface PkgInfo {
  pkgname: string;
  pkgbase?: string;
  pkgver: string;
  pkgdesc?: string;
  size?: string;
  url?: string;
  arch?: string;
  builddate?: string;
  packager?: string;
  group: string[];
  license: string[];
  replace: string[];
  depend: string[];
  conflict: string[];
  provide: string[];
  optdepend: string[];
  makedepend: string[];
  checkdepend: string[];
}

export function parsePkgInfo(info: string): PkgInfo {
  const lines = info.split("\n");

  const state: {
    [key in keyof PkgInfo]: PkgInfo[key] extends Array<any>
      ? PkgInfo[key]
      : PkgInfo[key] | undefined;
  } = {
    pkgname: undefined,
    pkgbase: undefined,
    pkgver: undefined,
    pkgdesc: undefined,
    size: undefined,
    url: undefined,
    arch: undefined,
    builddate: undefined,
    packager: undefined,
    group: [],
    license: [],
    replace: [],
    depend: [],
    conflict: [],
    provide: [],
    optdepend: [],
    makedepend: [],
    checkdepend: [],
  };

  for (const line of lines) {
    if (line.startsWith("#") || line.match(/^\s*$/) !== null) {
      continue;
    }

    const match = /^(\w+)\s*=\s*(.+)\s*$/.exec(line);
    if (match !== null) {
      const key = match[1];
      const value = match[2];
      if (state.hasOwnProperty(key)) {
        const current = (state as any)[key];
        if (Array.isArray(current)) {
          current.push(value);
        } else {
          (state as any)[key] = value;
        }
      }
    } else {
      throw new Error("invalid line: " + line);
    }
  }

  const pkgname = state.pkgname;
  if (pkgname === undefined) {
    throw new Error("pkgname missing");
  }

  const pkgver = state.pkgver;
  if (pkgver === undefined) {
    throw new Error("pkgver missing");
  }

  return {
    ...state,
    pkgname,
    pkgver,
  };
}

export function extractVersionFromPkgInfo(pkginfo: PkgInfo): Version {
  return parseVersion(pkginfo.pkgver);
}

interface Section {
  pkgdesc?: string;
  url?: string;
  install?: string;
  changelog?: string;
  arch: string[];
  groups: string[];
  license: string[];
  noextract: string[];
  options: string[];
  backup: string[];
  validpgpkeys: string[];
  source_arch: { [arch: string]: string[] };
  source: string[];
  depends: string[];
  depends_arch: { [arch: string]: string[] };
  checkdepends: string[];
  makedepends: string[];
  optdepends: string[];
  provides: string[];
  conflicts: string[];
  replaces: string[];
  md5sums: string[];
  md5sums_arch: { [arch: string]: string[] };
  sha1sums: string[];
  sha1sums_arch: { [arch: string]: string[] };
  sha224sums: string[];
  sha224sums_arch: { [arch: string]: string[] };
  sha256sums: string[];
  sha256sums_arch: { [arch: string]: string[] };
  sha384sums: string[];
  sha364sums_arch: { [arch: string]: string[] };
  sha512sums: string[];
  sha512sums_arch: { [arch: string]: string[] };
}

export interface SrcInfo {
  pkgbase: {
    name: string;
    pkgver?: string;
    pkgrel?: string;
    epoch?: string;
  } & Section;
  packages: {
    [name: string]: Section;
  };
}

function emptySection(): Section {
  return {
    pkgdesc: undefined,
    url: undefined,
    install: undefined,
    changelog: undefined,
    arch: [],
    groups: [],
    license: [],
    noextract: [],
    options: [],
    backup: [],
    validpgpkeys: [],
    source_arch: {},
    source: [],
    depends: [],
    depends_arch: {},
    checkdepends: [],
    makedepends: [],
    optdepends: [],
    provides: [],
    conflicts: [],
    replaces: [],
    md5sums: [],
    md5sums_arch: {},
    sha1sums: [],
    sha1sums_arch: {},
    sha224sums: [],
    sha224sums_arch: {},
    sha256sums: [],
    sha256sums_arch: {},
    sha384sums: [],
    sha364sums_arch: {},
    sha512sums: [],
    sha512sums_arch: {},
  };
}

export function parseSrcInfo(input: string): SrcInfo {
  const lines = input.split("\n");

  // Parser state
  let pkgbase: string | undefined;
  let pkgver: string | undefined;
  let pkgrel: string | undefined;
  let epoch: string | undefined;
  const baseSection: Section = emptySection();
  const packages: { [name: string]: Section } = {};
  let currentPackage: Section | undefined;

  for (let lineNo = 1; lineNo <= lines.length; lineNo++) {
    const line = lines[lineNo - 1];

    function error(message: string): never {
      throw new Error("line " + lineNo + ": " + message + ": '" + line + "'");
    }
    function verifyUnset(current: any, key: string, value: string) {
      if (current !== undefined) {
        error(key + " may only be declared once");
      }
      return value;
    }

    // Ingore empty lines and comment lines starting with "#"
    if (line.match(/^\s*$/)) {
      continue;
    }

    const match = line.match(/^([^=]+)=(.+)$/);
    if (match === null) {
      error("expected a key value pair");
    } else {
      const key = match[1].trim();
      const value = match[2].trim();

      if (key === "pkgbase") {
        if (pkgbase) {
          error("pkgbase declared twice");
        }
        pkgbase = value;
        continue;
      }

      if (["pkgver", "pkgrel", "epoch"].includes(key)) {
        if (currentPackage !== undefined) {
          error(key + " may only be declared inside pkgbase section");
        }

        switch (key) {
          case "pkgver":
            pkgver = verifyUnset(pkgver, key, value);
            break;
          case "pkgrel":
            pkgrel = verifyUnset(pkgrel, key, value);
            break;
          case "epoch":
            epoch = verifyUnset(epoch, key, value);
            break;
        }
        continue;
      }

      if (key === "pkgname") {
        if (packages[value] !== undefined) {
          error("package with name " + value + " declared twice");
        }
        currentPackage = emptySection();
        packages[value] = currentPackage;
        continue;
      }

      if (
        key === "pkgdesc" ||
        key === "url" ||
        key === "install" ||
        key === "changelog"
      ) {
        const section = currentPackage || baseSection;
        section[key] = verifyUnset(section[key], key, value);
        continue;
      }

      if (
        key === "arch" ||
        key === "groups" ||
        key === "license" ||
        key === "noextract" ||
        key === "options" ||
        key === "backup" ||
        key === "validpgpkeys" ||
        key === "source" ||
        key === "depends" ||
        key === "checkdepends" ||
        key === "makedepends" ||
        key === "optdepends" ||
        key === "provides" ||
        key === "conflicts" ||
        key === "replaces" ||
        key === "md5sums" ||
        key === "sha1sums" ||
        key === "sha224sums" ||
        key === "sha256sums" ||
        key === "sha384sums" ||
        key === "sha512sums"
      ) {
        const section = currentPackage || baseSection;
        section[key].push(value);
        continue;
      }

      const matchArch = key.match(
        /^(source|depends|md5sums|sha1sums|sha224sums|sha256sums|sha386sums|sha512sums)_(.+)$/
      );
      if (matchArch !== null) {
        const key = matchArch[1];
        const arch = matchArch[2];
        const section: any = currentPackage || baseSection;
        if (section[key][arch] === undefined) {
          section[key][arch] = [value];
        } else {
          section[key][arch].push(value);
        }
        continue;
      }

      error("unrecognized key '" + key + "'");
    }
  }

  if (pkgbase === undefined) {
    throw new Error("no pkgbase declared");
  }

  return {
    pkgbase: {
      name: pkgbase,
      pkgver,
      pkgrel,
      epoch,
      ...baseSection,
    },
    packages,
  };
}

export function extractVersionFromSrcInfo(srcInfo: SrcInfo): Version {
  if (srcInfo.pkgbase.pkgver === undefined) {
    throw new Error("pkgver is not set");
  }

  return {
    epoch: srcInfo.pkgbase.epoch || "0",
    version: srcInfo.pkgbase.pkgver,
    release: srcInfo.pkgbase.pkgrel,
  };
}
