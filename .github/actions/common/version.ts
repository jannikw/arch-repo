// TypeScript implementations of:
// Arch Linux package versions
// see https://git.archlinux.org/pacman.git/tree/lib/libalpm/version.c

export interface Version {
  epoch: string;
  version: string;
  release?: string;
}

/** Comparsion result */
type Comparsion = "<" | "=" | ">";

/**
 * Parses a version string and turns it into an object
 * @param version the version string
 * @returns the parsed version
 */
export function parseVersion(version: string): Version {
  const result = /((\d*)(?:\:))?([^-]+)((?:-)(.*))?/.exec(version);

  if (result !== null) {
    const epoch = result[2] || "0";
    const version = result[3];
    const release =
      result[5] === undefined || result[5].length == 0 ? undefined : result[5];

    return { epoch, version, release };
  }

  throw new Error(`Cannot parse version ${version}`);
}

/**
 * Turns a version object into a version string
 * @param version the version object
 * @returns the version string
 */
export function versionString(version: Version): string {
  return `${
    version.epoch !== "0" && version.epoch !== "" ? version.epoch + ":" : ""
  }${version.version}${version.release ? "-" + version.release : ""}`;
}

function splitIntoSegments(block: string): string[] {
  let segments = [];
  const regex = /^([0-9]+|[a-zA-Z]+|[^0-9a-zA-Z]+)/;

  while (block.length > 0) {
    let match = regex.exec(block);

    if (match) {
      const segment = match[0];
      segments.push(segment);
      block = block.substr(segment.length);
    } else {
      throw new Error("regex did not match");
    }
  }

  return segments;
}

function compareSegments(partA: string, partB: string): Comparsion {
  const segmentsA = splitIntoSegments(partA);
  const segmentsB = splitIntoSegments(partB);

  function makeSegment(
    segment?: string
  ): { type: "alpha" | "numeric" | "separator" | "empty"; text: string } {
    if (segment !== undefined) {
      if (/^[a-zA-Z]+$/.test(segment)) {
        return { type: "alpha", text: segment };
      } else if (/^[0-9]+$/.test(segment)) {
        return { type: "numeric", text: segment };
      } else {
        return { type: "separator", text: segment };
      }
    }
    return { type: "empty", text: "" };
  }

  for (let i = 0; i < Math.max(segmentsA.length, segmentsB.length); i++) {
    const currentA = makeSegment(segmentsA[i]);
    const currentB = makeSegment(segmentsB[i]);

    if (currentA.type === "empty") {
      if (currentB.type === "alpha") {
        return ">";
      } else {
        return "<";
      }
    } else if (currentB.type === "empty") {
      if (currentA.type === "alpha") {
        return "<";
      } else {
        return ">";
      }
    }

    if (currentA.type === "separator" && currentB.type !== "separator") {
      return ">";
    } else if (currentA.type !== "separator" && currentB.type === "separator") {
      return "<";
    }

    if (currentA.type === "separator" && currentB.type === "separator") {
      if (currentA.text.length < currentB.text.length) {
        return "<";
      } else if (currentA.text.length > currentB.text.length) {
        return ">";
      }
    }

    // Numeric is always considered newer
    if (currentA.type === "numeric" && currentB.type === "alpha") {
      return ">";
    } else if (currentA.type === "alpha" && currentB.type === "numeric") {
      return "<";
    }

    if (currentA.type === "alpha" && currentB.type === "alpha") {
      if (currentA.text < currentB.text) {
        return "<";
      } else if (currentA.text > currentB.text) {
        return ">";
      }
    }

    if (currentA.type === "numeric" && currentB.type === "numeric") {
      const numA = parseInt(currentA.text);
      const numB = parseInt(currentB.text);

      if (numA < numB) {
        return "<";
      } else if (numA > numB) {
        return ">";
      }
    }
  }

  return "=";
}

/**
 * Compares two versions with each other
 * @param a version a
 * @param b version b
 * @returns the comparsion result
 */
export function compareVersions(a: Version, b: Version): Comparsion {
  let comparsion = compareSegments(a.epoch, b.epoch);
  if (comparsion === "=") {
    comparsion = compareSegments(a.version, b.version);
    if (comparsion === "=" && a.release && b.release) {
      comparsion = compareSegments(a.release, b.release);
    }

    return comparsion;
  }

  return comparsion;
}

/**
 * Tests whether two versions match exactly
 * @param a version a
 * @param b version b
 */
export function versionEquals(a: Version, b: Version): boolean {
  return (
    a.epoch === b.epoch && a.version === b.version && a.release === b.release
  );
}
