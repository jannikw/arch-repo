module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 351:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const os = __importStar(__nccwpck_require__(87));
const utils_1 = __nccwpck_require__(278);
/**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */
function issueCommand(command, properties, message) {
    const cmd = new Command(command, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
}
exports.issueCommand = issueCommand;
function issue(name, message = '') {
    issueCommand(name, {}, message);
}
exports.issue = issue;
const CMD_STRING = '::';
class Command {
    constructor(command, properties, message) {
        if (!command) {
            command = 'missing.command';
        }
        this.command = command;
        this.properties = properties;
        this.message = message;
    }
    toString() {
        let cmdStr = CMD_STRING + this.command;
        if (this.properties && Object.keys(this.properties).length > 0) {
            cmdStr += ' ';
            let first = true;
            for (const key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) {
                            first = false;
                        }
                        else {
                            cmdStr += ',';
                        }
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
        }
        cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
        return cmdStr;
    }
}
function escapeData(s) {
    return utils_1.toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A');
}
function escapeProperty(s) {
    return utils_1.toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/:/g, '%3A')
        .replace(/,/g, '%2C');
}
//# sourceMappingURL=command.js.map

/***/ }),

/***/ 186:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const command_1 = __nccwpck_require__(351);
const file_command_1 = __nccwpck_require__(717);
const utils_1 = __nccwpck_require__(278);
const os = __importStar(__nccwpck_require__(87));
const path = __importStar(__nccwpck_require__(622));
/**
 * The code to exit an action
 */
var ExitCode;
(function (ExitCode) {
    /**
     * A code indicating that the action was successful
     */
    ExitCode[ExitCode["Success"] = 0] = "Success";
    /**
     * A code indicating that the action was a failure
     */
    ExitCode[ExitCode["Failure"] = 1] = "Failure";
})(ExitCode = exports.ExitCode || (exports.ExitCode = {}));
//-----------------------------------------------------------------------
// Variables
//-----------------------------------------------------------------------
/**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportVariable(name, val) {
    const convertedVal = utils_1.toCommandValue(val);
    process.env[name] = convertedVal;
    const filePath = process.env['GITHUB_ENV'] || '';
    if (filePath) {
        const delimiter = '_GitHubActionsFileCommandDelimeter_';
        const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
        file_command_1.issueCommand('ENV', commandValue);
    }
    else {
        command_1.issueCommand('set-env', { name }, convertedVal);
    }
}
exports.exportVariable = exportVariable;
/**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */
function setSecret(secret) {
    command_1.issueCommand('add-mask', {}, secret);
}
exports.setSecret = setSecret;
/**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */
function addPath(inputPath) {
    const filePath = process.env['GITHUB_PATH'] || '';
    if (filePath) {
        file_command_1.issueCommand('PATH', inputPath);
    }
    else {
        command_1.issueCommand('add-path', {}, inputPath);
    }
    process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
}
exports.addPath = addPath;
/**
 * Gets the value of an input.  The value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */
function getInput(name, options) {
    const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
    if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
    }
    return val.trim();
}
exports.getInput = getInput;
/**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setOutput(name, value) {
    command_1.issueCommand('set-output', { name }, value);
}
exports.setOutput = setOutput;
/**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */
function setCommandEcho(enabled) {
    command_1.issue('echo', enabled ? 'on' : 'off');
}
exports.setCommandEcho = setCommandEcho;
//-----------------------------------------------------------------------
// Results
//-----------------------------------------------------------------------
/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
function setFailed(message) {
    process.exitCode = ExitCode.Failure;
    error(message);
}
exports.setFailed = setFailed;
//-----------------------------------------------------------------------
// Logging Commands
//-----------------------------------------------------------------------
/**
 * Gets whether Actions Step Debug is on or not
 */
function isDebug() {
    return process.env['RUNNER_DEBUG'] === '1';
}
exports.isDebug = isDebug;
/**
 * Writes debug message to user log
 * @param message debug message
 */
function debug(message) {
    command_1.issueCommand('debug', {}, message);
}
exports.debug = debug;
/**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 */
function error(message) {
    command_1.issue('error', message instanceof Error ? message.toString() : message);
}
exports.error = error;
/**
 * Adds an warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 */
function warning(message) {
    command_1.issue('warning', message instanceof Error ? message.toString() : message);
}
exports.warning = warning;
/**
 * Writes info to log with console.log.
 * @param message info message
 */
function info(message) {
    process.stdout.write(message + os.EOL);
}
exports.info = info;
/**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */
function startGroup(name) {
    command_1.issue('group', name);
}
exports.startGroup = startGroup;
/**
 * End an output group.
 */
function endGroup() {
    command_1.issue('endgroup');
}
exports.endGroup = endGroup;
/**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */
function group(name, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        startGroup(name);
        let result;
        try {
            result = yield fn();
        }
        finally {
            endGroup();
        }
        return result;
    });
}
exports.group = group;
//-----------------------------------------------------------------------
// Wrapper action state
//-----------------------------------------------------------------------
/**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveState(name, value) {
    command_1.issueCommand('save-state', { name }, value);
}
exports.saveState = saveState;
/**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */
function getState(name) {
    return process.env[`STATE_${name}`] || '';
}
exports.getState = getState;
//# sourceMappingURL=core.js.map

/***/ }),

/***/ 717:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


// For internal use, subject to change.
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
// We use any as a valid input type
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs = __importStar(__nccwpck_require__(747));
const os = __importStar(__nccwpck_require__(87));
const utils_1 = __nccwpck_require__(278);
function issueCommand(command, message) {
    const filePath = process.env[`GITHUB_${command}`];
    if (!filePath) {
        throw new Error(`Unable to find environment variable for file command ${command}`);
    }
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file at path: ${filePath}`);
    }
    fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
        encoding: 'utf8'
    });
}
exports.issueCommand = issueCommand;
//# sourceMappingURL=file-command.js.map

/***/ }),

/***/ 278:
/***/ ((__unused_webpack_module, exports) => {


// We use any as a valid input type
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
function toCommandValue(input) {
    if (input === null || input === undefined) {
        return '';
    }
    else if (typeof input === 'string' || input instanceof String) {
        return input;
    }
    return JSON.stringify(input);
}
exports.toCommandValue = toCommandValue;
//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 573:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(186));
const fs = __importStar(__nccwpck_require__(747));
const path_1 = __nccwpck_require__(622);
const arch_1 = __nccwpck_require__(253);
const version_1 = __nccwpck_require__(408);
const utils_1 = __nccwpck_require__(455);
const utils_2 = __nccwpck_require__(455);
const workspace = utils_1.requireEnv("GITHUB_WORKSPACE");
const packagesDir = path_1.join(workspace, core.getInput("packages", { required: true }));
const repositoryDir = path_1.join(workspace, core.getInput("repository", { required: true }));
action().catch((error) => {
    core.setFailed(error.message);
});
async function action() {
    core.info("checking for built packages in repository");
    const builtPackages = await getBuiltPackageVersions(repositoryDir);
    core.info("determine outdated packages");
    const packagesToBuild = [];
    for (const packageDir of await utils_1.getDirSubdirs(packagesDir)) {
        const srcInfoPath = path_1.join(packagesDir, packageDir, ".SRCINFO");
        // TODO: Also check for PKGBUILD?
        if (await utils_2.checkFileExists(srcInfoPath)) {
            const content = await fs.promises.readFile(srcInfoPath, {
                encoding: "utf-8",
            });
            const srcInfo = arch_1.parseSrcInfo(content);
            const version = arch_1.extractVersionFromSrcInfo(srcInfo);
            const pkgName = srcInfo.pkgbase.name;
            const builtVersion = builtPackages[pkgName];
            const comparison = builtVersion === undefined
                ? ">"
                : version_1.compareVersions(version, builtVersion);
            const builtVersionStr = (builtVersion && version_1.versionString(builtVersion)) || "n/a";
            const versionStr = version_1.versionString(version);
            if (comparison === "=") {
                core.info(`package ${pkgName} in repository is up to date: ${builtVersionStr} => ${versionStr}`);
            }
            else if (comparison === ">") {
                core.info(`package "${pkgName}" in repository is outdated: ${builtVersionStr} => ${versionStr}`);
                packagesToBuild.push(packageDir);
            }
            else if (comparison == "<") {
                core.warning(`package ${pkgName} is newer in repository! ${builtVersionStr} => ${versionStr}`);
            }
        }
    }
    core.setOutput("outdated-package", packagesToBuild);
}
async function getBuiltPackageVersions(packageDir) {
    const packages = {};
    for (const fileName of await utils_2.getDirFiles(packageDir)) {
        if (!fileName.endsWith(".sig") &&
            /^([a-zA-Z0-9@._+\-]+)-((?:\d*\:)?[^-]+(?:-.*)?)-(x86_64|any)(\.pkg.tar(?:\.\w+)+)$/.exec(fileName)) {
            const pkgPath = path_1.join(packageDir, fileName);
            const { stdout } = await utils_2.execFile("bsdtar", [
                "-xOqf",
                pkgPath,
                ".PKGINFO",
            ]);
            const pkginfo = arch_1.parsePkgInfo(stdout);
            const version = arch_1.extractVersionFromPkgInfo(pkginfo);
            const name = pkginfo.pkgname;
            core.info(`found package ${name} at version ${pkginfo.pkgver}`);
            // Skip version if a new one was already collected
            const current = packages[name];
            if (current !== undefined) {
                if (version_1.compareVersions(current, version) === ">") {
                    continue;
                }
            }
            packages[name] = version;
        }
    }
    return packages;
}


/***/ }),

/***/ 253:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {


// TypeScript implementations of:
// - Parsing of SRCINFO files
// - Parsing of PKGINFO files
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.extractVersionFromSrcInfo = exports.parseSrcInfo = exports.extractVersionFromPkgInfo = exports.parsePkgInfo = void 0;
const version_1 = __nccwpck_require__(408);
function parsePkgInfo(info) {
    const lines = info.split("\n");
    const state = {
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
                const current = state[key];
                if (Array.isArray(current)) {
                    current.push(value);
                }
                else {
                    state[key] = value;
                }
            }
        }
        else {
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
exports.parsePkgInfo = parsePkgInfo;
function extractVersionFromPkgInfo(pkginfo) {
    return version_1.parseVersion(pkginfo.pkgver);
}
exports.extractVersionFromPkgInfo = extractVersionFromPkgInfo;
function emptySection() {
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
function parseSrcInfo(input) {
    const lines = input.split("\n");
    // Parser state
    let pkgbase;
    let pkgver;
    let pkgrel;
    let epoch;
    const baseSection = emptySection();
    const packages = {};
    let currentPackage;
    for (let lineNo = 1; lineNo <= lines.length; lineNo++) {
        const line = lines[lineNo - 1];
        function error(message) {
            throw new Error("line " + lineNo + ": " + message + ": '" + line + "'");
        }
        function verifyUnset(current, key, value) {
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
        }
        else {
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
            if (key === "pkgdesc" ||
                key === "url" ||
                key === "install" ||
                key === "changelog") {
                const section = currentPackage || baseSection;
                section[key] = verifyUnset(section[key], key, value);
                continue;
            }
            if (key === "arch" ||
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
                key === "sha512sums") {
                const section = currentPackage || baseSection;
                section[key].push(value);
                continue;
            }
            const matchArch = key.match(/^(source|depends|md5sums|sha1sums|sha224sums|sha256sums|sha386sums|sha512sums)_(.+)$/);
            if (matchArch !== null) {
                const key = matchArch[1];
                const arch = matchArch[2];
                const section = currentPackage || baseSection;
                if (section[key][arch] === undefined) {
                    section[key][arch] = [value];
                }
                else {
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
exports.parseSrcInfo = parseSrcInfo;
function extractVersionFromSrcInfo(srcInfo) {
    if (srcInfo.pkgbase.pkgver === undefined) {
        throw new Error("pkgver is not set");
    }
    return {
        epoch: srcInfo.pkgbase.epoch || "0",
        version: srcInfo.pkgbase.pkgver,
        release: srcInfo.pkgbase.pkgrel,
    };
}
exports.extractVersionFromSrcInfo = extractVersionFromSrcInfo;


/***/ }),

/***/ 455:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.requireEnv = exports.tryUnlink = exports.checkFileExists = exports.getDirFiles = exports.getDirSubdirs = exports.execFile = void 0;
const util_1 = __importDefault(__nccwpck_require__(669));
const child_process_1 = __importDefault(__nccwpck_require__(129));
const fs_1 = __importDefault(__nccwpck_require__(747));
exports.execFile = util_1.default.promisify(child_process_1.default.execFile);
async function getDirSubdirs(path) {
    const entries = await fs_1.default.promises.readdir(path, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}
exports.getDirSubdirs = getDirSubdirs;
async function getDirFiles(path) {
    const entries = await fs_1.default.promises.readdir(path, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
}
exports.getDirFiles = getDirFiles;
async function checkFileExists(path) {
    return await fs_1.default.promises
        .access(path, fs_1.default.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}
exports.checkFileExists = checkFileExists;
async function tryUnlink(path) {
    try {
        await fs_1.default.promises.unlink(path);
        return true;
    }
    catch (err) {
        // if the file didn't exist before, this is not an issue
        if (err.code !== "ENOENT") {
            throw err;
        }
        return false;
    }
}
exports.tryUnlink = tryUnlink;
function requireEnv(name) {
    const value = process.env[name];
    if (value === undefined) {
        throw new Error(`${name} must be defined`);
    }
    return value;
}
exports.requireEnv = requireEnv;


/***/ }),

/***/ 408:
/***/ ((__unused_webpack_module, exports) => {


// TypeScript implementations of:
// Arch Linux package versions
// see https://git.archlinux.org/pacman.git/tree/lib/libalpm/version.c
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.versionEquals = exports.compareVersions = exports.versionString = exports.parseVersion = void 0;
/**
 * Parses a version string and turns it into an object
 * @param version the version string
 * @returns the parsed version
 */
function parseVersion(version) {
    const result = /((\d*)(?:\:))?([^-]+)((?:-)(.*))?/.exec(version);
    if (result !== null) {
        const epoch = result[2] || "0";
        const version = result[3];
        const release = result[5] === undefined || result[5].length == 0 ? undefined : result[5];
        return { epoch, version, release };
    }
    throw new Error(`Cannot parse version ${version}`);
}
exports.parseVersion = parseVersion;
/**
 * Turns a version object into a version string
 * @param version the version object
 * @returns the version string
 */
function versionString(version) {
    return `${version.epoch !== "0" && version.epoch !== "" ? version.epoch + ":" : ""}${version.version}${version.release ? "-" + version.release : ""}`;
}
exports.versionString = versionString;
function splitIntoSegments(block) {
    let segments = [];
    const regex = /^([0-9]+|[a-zA-Z]+|[^0-9a-zA-Z]+)/;
    while (block.length > 0) {
        let match = regex.exec(block);
        if (match) {
            const segment = match[0];
            segments.push(segment);
            block = block.substr(segment.length);
        }
        else {
            throw new Error("regex did not match");
        }
    }
    return segments;
}
function compareSegments(partA, partB) {
    const segmentsA = splitIntoSegments(partA);
    const segmentsB = splitIntoSegments(partB);
    function makeSegment(segment) {
        if (segment !== undefined) {
            if (/^[a-zA-Z]+$/.test(segment)) {
                return { type: "alpha", text: segment };
            }
            else if (/^[0-9]+$/.test(segment)) {
                return { type: "numeric", text: segment };
            }
            else {
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
            }
            else {
                return "<";
            }
        }
        else if (currentB.type === "empty") {
            if (currentA.type === "alpha") {
                return "<";
            }
            else {
                return ">";
            }
        }
        if (currentA.type === "separator" && currentB.type !== "separator") {
            return ">";
        }
        else if (currentA.type !== "separator" && currentB.type === "separator") {
            return "<";
        }
        if (currentA.type === "separator" && currentB.type === "separator") {
            if (currentA.text.length < currentB.text.length) {
                return "<";
            }
            else if (currentA.text.length > currentB.text.length) {
                return ">";
            }
        }
        // Numeric is always considered newer
        if (currentA.type === "numeric" && currentB.type === "alpha") {
            return ">";
        }
        else if (currentA.type === "alpha" && currentB.type === "numeric") {
            return "<";
        }
        if (currentA.type === "alpha" && currentB.type === "alpha") {
            if (currentA.text < currentB.text) {
                return "<";
            }
            else if (currentA.text > currentB.text) {
                return ">";
            }
        }
        if (currentA.type === "numeric" && currentB.type === "numeric") {
            const numA = parseInt(currentA.text);
            const numB = parseInt(currentB.text);
            if (numA < numB) {
                return "<";
            }
            else if (numA > numB) {
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
function compareVersions(a, b) {
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
exports.compareVersions = compareVersions;
/**
 * Tests whether two versions match exactly
 * @param a version a
 * @param b version b
 */
function versionEquals(a, b) {
    return (a.epoch === b.epoch && a.version === b.version && a.release === b.release);
}
exports.versionEquals = versionEquals;


/***/ }),

/***/ 129:
/***/ ((module) => {

module.exports = require("child_process");;

/***/ }),

/***/ 747:
/***/ ((module) => {

module.exports = require("fs");;

/***/ }),

/***/ 87:
/***/ ((module) => {

module.exports = require("os");;

/***/ }),

/***/ 622:
/***/ ((module) => {

module.exports = require("path");;

/***/ }),

/***/ 669:
/***/ ((module) => {

module.exports = require("util");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __nccwpck_require__(573);
/******/ })()
;