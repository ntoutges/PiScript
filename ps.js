const fs = require("node:fs");
const { run } = require("./lib/interpreter.js");

if (process.argv.length == 2) throw new Error("No input file supplied");
const filename = process.argv[2];

fs.readFile(filename, "utf-8", (err, data) => {
  if (err) throw err;
  run(data);
});