export type tokenType = "empty" | "path" | "name" | "operator" | "unknown";

export class ProgToken {
  readonly type: tokenType;
  readonly value: string;

  constructor(
    type: tokenType,
    value: string
  ) {
    this.type = type;
    this.value = value;
  }

  matches(other: ProgToken) {
    return this.type == other.type && this.value == other.value;
  }

  toString() {
    return this.type + "." + this.value;
  }
}

export const emptyToken = new ProgToken("empty", " ");
const operators = "PpE^v+-@|<>:."

export function tokenize(prgStr: string) {
  const lines = prgStr.replace(/\r/g, "").replace(/ +$/gm, "").split("\n"); // remove \r, and trailing whitespace

  const tokens: ProgToken[][] = [];
  for (const line of lines) {
    const lineTokens: ProgToken[] = []
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const usedIndicies = new Set<number>();

      if (char == " ") { // empty space
        lineTokens.push(emptyToken);
        usedIndicies.add(i);
      }
      else if (/\d/.test(char)) { // digit
        lineTokens.push(
          new ProgToken(
            "path",
            char
          )
        );
        usedIndicies.add(i);
      }
      else if (/[a-z_]/i.test(char)) { // other
        if (
          (i + 1 >= line.length || line[i+1] == " " || line[i+1] == "|")
          && operators.includes(line[i])
        ) { // next char empty space or pipe
          lineTokens.push( // operator whose char is allowed within name
            new ProgToken(
              "operator",
              char
            )
          );
          continue;
        }
        
        let text = char;
        const oldI = i;

        // find any more tokens to the right
        i++
        while (i < line.length && /[a-z0-9_@\[\]]/i.test(line[i])) { // alphanumeric allowed in non-last character
          text += line[i];
          i++;
        }

        // use the same token for every entry in the the name
        const token = new ProgToken("name", text);
        for (let j = oldI; j < i; j++) { lineTokens.push(token); }

        i--; // undo extra addition
      }
      else if (operators.includes(char)) {
        lineTokens.push( // operator whos char is not allowed within name
          new ProgToken(
            "operator",
            char
          )
        );
      }
      else {
        lineTokens.push(
          new ProgToken(
            "unknown",
            char
          )
        );
      }
    }
    tokens.push(lineTokens);
  }

  return tokens;
}