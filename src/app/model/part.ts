import { Block } from "./block";

export class Part{
    public blocks:Block[] = [];
    constructor(blocks:Block[]){
        this.blocks = blocks;
    } 
}