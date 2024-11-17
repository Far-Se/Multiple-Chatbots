const fs = require("fs");
const { join } = require("path");
const archiver = require("archiver");


function incrementVersion(version) {
    const versionParts = version.split(".");
    const patchVersion = parseInt(versionParts[2], 10) + 1;
    versionParts[2] = patchVersion.toString();
    return versionParts.join(".");
}

if (process.argv[2]) {
    const manifest = require(join(__dirname, "manifest.json"));
    manifest.version = incrementVersion(manifest.version);
    console.log(`New Version: ${manifest.version}`);
    fs.writeFileSync(join(__dirname, "manifest.json"), JSON.stringify(manifest, null, 2));
}
fs.rmSync("archive.zip", { force: true });
const output = fs.createWriteStream(join(__dirname, "archive.zip"));

const archive = archiver("zip", {
    zlib: { level: 9 }
});

output.on("close", function () {
    console.log(`Archive created successfully! Total bytes: ${archive.pointer()}`);
});

archive.on("error", function (err) {
    throw err;
});

archive.pipe(output);
let files = [
    "background.js",
    "index.html",
    "pico.conditional.slate.min.css",
    "manifest.json",
    "script.js",
    "style.css",
];
for(const file of files)
{
    archive.file(join(__dirname, file), { name: file });
}
archive.directory(join(__dirname, "icons"), "icons");

archive.finalize();
