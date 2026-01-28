import { ComputedStyleMap } from "./css/computed_style_map";
import { MessageBuilder } from "./utility";

export class $Node {
    parentNode: $Node | null = null;
    children: $Node[] = [];
}

export class $Document extends $Node {}

export class $DocumentType extends $Node {
    name: string;
    publicId: string;
    systemId: string;

    constructor(name: string, publidId: string, systemId: string) {
        super();
        this.name = name;
        this.publicId = publidId;
        this.systemId = systemId;
    }
}

export class $Attr extends $Node {
    name: string;
    value: string;

    constructor(name: string, value: string) {
        super();
        this.name = name;
        this.value = value;
    }
}

export class $Element extends $Node {
    localName: string;
    attrs: $Attr[] = [];
    __csm: ComputedStyleMap | null = null;

    constructor(localName: string) {
        super();
        this.localName = localName;
    }
    fn() {
        console.log("hello, world!");
    }
    get csm(): ComputedStyleMap {
        if (this.__csm === null) {
            throw Error("csm hasn't been set yet");
        }
        return this.__csm;
    }
    set csm(csm: ComputedStyleMap) {
        this.__csm = csm;
    }
    
}

export abstract class $CharacterData extends $Node {
    data: string;

    constructor(data: string) {
        super();
        this.data = data;
    }
}

export class $Text extends $CharacterData {}

function dumpDOMNode(mb: MessageBuilder, node: $Node, indent: number) {
    const indentStr = " ".repeat(indent * 4);
    if (node instanceof $Document) {
        mb.fgColor = "initial";
        mb.push(indentStr + "#document\n");
    } else if (node instanceof $DocumentType) {
        mb.fgColor = "darkgray";
        mb.push(indentStr + `<!DOCTYPE ${node.name}>\n`);
    } else if (node instanceof $Element) {
        mb.fgColor = "brown";
        mb.push(indentStr + `<${node.localName}`);
        for (const attr of node.attrs) {
            mb.push(` ${attr.name}`);
            if (attr.value !== "") {
                mb.push("=");
                mb.fgColor = "blue";
                mb.push(`"${attr.value}"`);
                mb.fgColor = "brown";
            }
        }
        mb.push(`>\n`);
    } else if (node instanceof $Text) {
        mb.fgColor = "initial";
        mb.push(indentStr + `${node.data.replace("\n", "\\n")}\n`);
    } else {
        mb.fgColor = "blue";
        mb.push(indentStr + "#node\n");
    }
    for (const child of node.children) {
        dumpDOMNode(mb, child, indent + 1);
    }
    if (node instanceof $Element) {
        mb.fgColor = "brown";
        mb.push(indentStr + `</${node.localName}>\n`);
    }
}

export function printDOMTree(node: $Node) {
    const mb = new MessageBuilder();
    dumpDOMNode(mb, node, 0);
    mb.log();
}
