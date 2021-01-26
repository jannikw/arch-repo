import { parseVersion, compareVersions } from "./version";
import { describe, it } from "@jest/globals";

interface TestCase {
  a: string;
  b: string;
  cmp: "<" | "=" | ">";
}

describe("compareVersions(a, b)", function () {
  const cases: TestCase[] = [
    // all similar length, no pkgrel
    { a: "1.5.0", b: "1.5.0", cmp: "=" },
    { a: "1.5.1", b: "1.5.0", cmp: ">" },

    // mixed length
    { a: "1.5.1", b: "1.5", cmp: ">" },

    // with pkgrel, simple
    { a: "1.5.0-1", b: "1.5.0-1", cmp: "=" },
    { a: "1.5.0-1", b: "1.5.0-2", cmp: "<" },
    { a: "1.5.0-1", b: "1.5.1-1", cmp: "<" },
    { a: "1.5.0-2", b: "1.5.1-1", cmp: "<" },

    // with pkgrel, mixed lengths
    { a: "1.5-1", b: "1.5.1-1", cmp: "<" },
    { a: "1.5-2", b: "1.5.1-1", cmp: "<" },
    { a: "1.5-2", b: "1.5.1-2", cmp: "<" },

    // mixed pkgrel inclusion
    { a: "1.5", b: "1.5-1", cmp: "=" },
    { a: "1.1-1", b: "1.1", cmp: "=" },
    { a: "1.0-1", b: "1.1", cmp: "<" },
    { a: "1.1-1", b: "1.0", cmp: ">" },

    // alphanumeric versions
    { a: "1.5b-1", b: "1.5-1", cmp: "<" },
    { a: "1.5b", b: "1.5", cmp: "<" },
    { a: "1.5b-1", b: "1.5", cmp: "<" },
    { a: "1.5b", b: "1.5.1", cmp: "<" },

    // from the manpage
    { a: "1.0a", b: "1.0alpha", cmp: "<" },
    { a: "1.0alpha", b: "1.0b", cmp: "<" },
    { a: "1.0b", b: "1.0beta", cmp: "<" },
    { a: "1.0beta", b: "1.0rc", cmp: "<" },
    { a: "1.0rc", b: "1.0", cmp: "<" },

    // going crazy? alpha-dotted versions
    { a: "1.5.a", b: "1.5", cmp: ">" },
    { a: "1.5.b", b: "1.5.a", cmp: ">" },
    { a: "1.5.1", b: "1.5.b", cmp: ">" },

    // alpha dots and dashes
    { a: "1.5.b-1", b: "1.5.b", cmp: "=" },
    { a: "1.5-1", b: "1.5.b", cmp: "<" },

    // same/similar content, differing separators
    { a: "2.0", b: "2_0", cmp: "=" },
    { a: "2.0_a", b: "2_0.a", cmp: "=" },
    { a: "2.0a", b: "2.0.a", cmp: "<" },
    { a: "2___a", b: "2_a", cmp: ">" },

    // epoch included version comparisons
    { a: "0:1.0", b: "0:1.0", cmp: "=" },
    { a: "0:1.0", b: "0:1.1", cmp: "<" },
    { a: "1:1.0", b: "0:1.0", cmp: ">" },
    { a: "1:1.0", b: "0:1.1", cmp: ">" },
    { a: "1:1.0", b: "2:1.1", cmp: "<" },

    // epoch + sometimes present pkgrel
    { a: "1:1.0", b: "0:1.0-1", cmp: ">" },
    { a: "1:1.0-1", b: "0:1.1-1", cmp: ">" },

    // epoch included on one version
    { a: "0:1.0", b: "1.0", cmp: "=" },
    { a: "0:1.0", b: "1.1", cmp: "<" },
    { a: "0:1.1", b: "1.0", cmp: ">" },
    { a: "1:1.0", b: "1.0", cmp: ">" },
    { a: "1:1.0", b: "1.1", cmp: ">" },
    { a: "1:1.1", b: "1.1", cmp: ">" },

    // Additional test samples
    { a: "4.2", b: "10.0", cmp: "<" },
  ];

  function reverse(test: TestCase) {
    return {
      a: test.b,
      b: test.a,
      cmp: test.cmp === "=" ? "=" : test.cmp === "<" ? ">" : "<",
    };
  }

  [...cases, ...cases.map(reverse)].forEach((test) => {
    it("correctly compares " + test.a + " and " + test.b, function () {
      const versionA = parseVersion(test.a);
      const versionB = parseVersion(test.b);

      expect(versionA).not.toBeUndefined();
      expect(versionB).not.toBeUndefined();
      expect(compareVersions(versionA, versionB)).toEqual(test.cmp);
    });
  });
});
