import { Program } from "./program";
import { ProgToken, tokenType, tokenize } from "./tokenizer";
const fs = require("node:fs");
const readline = require('node:readline').createInterface({ input: process.stdin, output: process.stdout });

const piStr = fs.readFileSync("pi.txt", "utf-8");

const lineCt = 20;
const lines = [];
for (let i = 0; i < lineCt; i++) { lines.push(""); }

export async function run(prgStr: string) {
  const prg = new Program(piStr, prgStr);
  
  prg.on("print", (x) => {
    lines[lines.length-1] += x.split("\n")[0];
    lines.push(...x.split("\n").slice(1));
    
    
    lines.splice(0, lines.length-lineCt); // only keep last 10 lines
    console.log(lines.join("\n"));
  });
  
  let readBuffer = [];
  prg.on("read", (callback: (char: string) => void) => {
    if (readBuffer.length > 0) callback(readBuffer.pop());
    else { // buffer empty, must refill
      readline.question("", (answer: string) => {
        readBuffer.push(...Array.from(answer).reverse()); // first char on the end, for more effecient popping
        callback(readBuffer.length == 0 ? " " : readBuffer.pop());
    
      });
    }
  });

  let cleanExit = false;
  try {
    while(!cleanExit && prg.tick()) {
      const below = prg.get(0,1);
      if (below.type == "operator") {
        const register = prg.piChar();
        let operator: string = below.value;
        let value = register;
        let grounded = false;

        let offset = 2;

        while(operator !== null && "@|.<>:".includes(operator)) {
          switch (operator) {
            case "@": // load from reference
              value = prg.vars.getRegister(value, grounded ? value : null);
              break;
            case "|": // chain signal down (do nothing else...)
              break;
            case ".": // ground signal: null variable becomes 0
              grounded = true;
              break;

            // direction modifiers can be chained downwards
            case ":":
              prg.setDirection(0); // reverse
              break;
            case "<":
              if (prg.pc.velocity()[0] > 0) prg.setDirection(-1); // moving right, so reverse to left
              break;
            case ">":
              if (prg.pc.velocity()[0] < 0) prg.setDirection(1); // moving left, so reverse to right
              break;
          }
          operator = getTokenValue("operator", prg, offset, false);
          offset++;
        }
        if (operator === null) continue; // chainable operator didn't chain
        
        switch (operator) {
          case "v": // load 'value' into 'varName'
            prg.vars.set(
              getTokenValue("name", prg, offset),
              value
            );
            break;
          case "^": { // store 'varName' into 'value' register
            let token = getTokenValue(["name", "empty", "operator"], prg, offset);

            let threshold = null;
            if (token.type == "operator") { // threshold operators
              if (!"<>=".includes(token.value)) throw new Error(`Expecting </>/= operator at ${prg.pc.at(1,1+offset).slice(0,2)}`); // invalid operator type
              offset++;
              threshold = token.value;
              token = getTokenValue(["name", "empty"], prg, offset); // get next token (and don't allow operator)
            }

            let nameVal = 0;
            if (token.type == "empty") nameVal = register;
            else if (token.type == "name") nameVal = await prg.vars.get( token.value, grounded ? register : null ); // if var doesn't exist, reset register to "floating" with null, unless grounded

            if (threshold !== null) { // convert value in range (-inf, inf) to be in the set {0,1}
              if (nameVal === null) nameVal = Math.floor(Math.random() * 2); // ungrounded random value: 50% chance of 0, and 50% of 1
              else {
                switch (threshold) {
                  case ">": // 'value' > 'refTokenVal'
                    nameVal = (value > nameVal) ? 1 : 0;
                    break;
                  case "<": // 'value' < 'refTokenVal'
                    nameVal = (value < nameVal) ? 1 : 0;
                    break;
                  case "=": // 'value' == 'refTokenVal'
                    nameVal = (value == nameVal) ? 1 : 0;
                    break;
                }
              }
            }

            prg.vars.setRegister(
              register,
              nameVal
            );
            break;
          }
          case "-": { // subtract variable from register, then put back into original register
            const token = getTokenValue(["name", "empty"], prg, offset);
            let nameVal = 0
            if (token.type == "empty") nameVal = prg.vars.getRegister(register, grounded ? register : null);
            else if (token.type == "name") nameVal = await prg.vars.get( token.value, grounded ? register : null ); // if var doesn't exist, reset register to "floating" with null, unless grounded

            if (nameVal === null) nameVal = Math.floor(Math.random() * 10);

            prg.vars.setRegister( register, value - nameVal );
            break;
          }
          case "+": { // add variable to register, then put back into original register
            const token = getTokenValue(["name", "empty"], prg, offset);
            let nameVal = 0;
            if (token.type == "empty") nameVal = prg.vars.getRegister(register, grounded ? register : null);
            else if (token.type == "name") nameVal = await prg.vars.get(token.value, grounded ? register : null); // if var doesn't exist, reset register to "floating" with null, unless grounded
            
            if (nameVal === null) nameVal = Math.floor(Math.random() * 10);

            prg.vars.setRegister( register, value + nameVal );
            break;
          }
          case "p": // choose branch direction based on value
            prg.setBranchType(value, false);
            break;
          case "P": // choose branch direction based on priority
            prg.setBranchType(value, true);
            break;
          case "E":
            cleanExit = true;
            break;
        }
      }
    }
  }
  catch(err) {
    console.log("");
    throw err;
  }

  if (!cleanExit) console.log(`\nCrashed at ${prg.pc.at(1,1).slice(0,2)}; Could not find ${prg.piChar()}`);
  readline.close();
}

function getTokenValue( type: tokenType, prg: Program, offset: number, throwErr?: boolean): string;
function getTokenValue( type: tokenType[], prg: Program, offset: number, throwErr?: boolean): ProgToken;
function getTokenValue(
  type: tokenType | tokenType[],
  prg: Program,
  offset: number,
  throwErr = true
) { 
  const token = prg.get(0,offset);
  if (Array.isArray(type)) {
    if (!type.includes(token.type)) {
      if (throwErr) throw new Error(`Expecting ${type.join("/")} token at ${prg.pc.at(1,1 + offset).slice(0,2)}`);
      return null;
    }
    return token;
  }
  if (token.type != type) {
    if (throwErr) throw new Error(`Expecting ${type} token at ${prg.pc.at(1,1+offset).slice(0,2)}`);
    return null;
  }
  return token.value;
}

function sleep(ms: number) {
  return new Promise(resolve => { setTimeout(resolve, ms); });
}