import {Block} from './block';
import { Part } from './part';
export class Song {
    public parts:Part[] = [];
    constructor(parts:Part[]){
        this.parts = parts;
    }
}