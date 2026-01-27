import { Color } from "../css/color";
import { TextDecorationOptions } from "../css/text_decor";
import { PhysicalRect } from "./types";

export class TextFragment {
    rect: PhysicalRect;
    text: string;
    font: string[];
    fontSize: number;
    color: Color;
    textDecorOptions: TextDecorationOptions[];

    constructor(
        rect: PhysicalRect,
        text: string,
        font: string[],
        fontSize: number,
        color: Color,
        textDecorOptions: TextDecorationOptions[],
    ) {
        this.rect = rect;
        this.text = text;
        this.font = font;
        this.fontSize = fontSize;
        this.color = color;
        this.textDecorOptions = textDecorOptions;
    }
}
