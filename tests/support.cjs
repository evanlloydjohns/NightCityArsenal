/* Small filesystem helpers shared by the development checks. No browser dependency. */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

const artifactPath = (...parts) => path.join(root, ".tmp/tests", ...parts);
function artifactDir(...parts) {
  const directory = artifactPath(...parts);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}
function writeReport(filename, report) {
  const destination = artifactPath(filename);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(report, null, 2));
}

module.exports = { root, artifactPath, artifactDir, writeReport };
