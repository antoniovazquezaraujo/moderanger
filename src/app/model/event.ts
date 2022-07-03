export interface SongEvent{
    process():void;
}
export interface NoteEvent extends SongEvent{
}
export interface CommandEvent extends SongEvent{
}