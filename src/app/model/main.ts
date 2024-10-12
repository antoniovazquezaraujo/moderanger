// src/main.ts
import { parse } from './song.parser';

class Main {
  public static run() {
    const exampleText = "This is a sample song text.";
    const result = parse(exampleText);
    
    console.log(result);
  }
}

Main.run();
