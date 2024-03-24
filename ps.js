const fs = require("node:fs");
const { run } = require("./lib/interpreter.js");

const flags = process.argv.slice(2).filter(arg => arg[0] == "-").map(arg => arg.substring(1));
const filenames = process.argv.slice(2).filter(arg => arg[0] != "-");

if (filenames.length < 0) throw new Error("No input file supplied");

runFiles(filenames, flags);

async function runFiles(filenames, flags) {
  const flagSet = new Map(flags.map(flag => { // map contains numeric part of flag
    const i = Array.from(flag).findIndex(char => !isNaN(char));
    if (i == -1) return [ flag,0 ];
    else return [ flag.substring(0,i), flag.substring(+i) ];
  }));
  
  for (const filename of filenames) {
    try {
      await runFile(filename, flagSet);
    }
    catch(err) {
      console.error(err.toString());
      return;
    }
  }
}

function runFile(filename, flagSet) {
  return new Promise((resolve,reject) => {
    fs.readFile(filename, "utf-8", (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      try { run(data, flagSet); }
      catch(err) { reject(err); }
      resolve();
    });
  });
}
