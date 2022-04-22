import { Block } from "./block";
import { Part } from "./part";

export class XNode {
   
    main() {
        let block:Block = new Block();
        block.children = [
            new Block({children: [new Block()]}),
            new Block(),
        ]
        let part:Part = new Part();
        part.block = block;
        console.log(JSON.stringify(part));
    }
}

