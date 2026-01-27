import { AtRule, QualifiedRule } from "./syntax";

class PropertyValue {} // STUB
class Selector {} // STUB
export class $MediaList {} // STUB

export type Declaration = {
    name: string;
    value: PropertyValue;
    isImportant: boolean;
};

export type StyleRule = {
    selector_list: Selector;
    declarations: Declaration[];
    at_rules: AtRule[];
};

export type StylesheetInit = {
    location: string | null;
    parentStylesheet: $Stylesheet | null;
    ownerNode: Node | null;
    ownerRule: StyleRule | null;
    media: $MediaList;
    title: string;
    alternateFlag: boolean;
    originCleanFlag: boolean;
    constructedFlag: boolean;
    constructorDocument: Node | null;
};

export class $Stylesheet {
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-type
    type: string;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-location
    location: string | null;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-parent-css-style-sheet
    parentStylesheet: $Stylesheet | null;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-owner-node
    ownerNode: Node | null;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-owner-css-rule
    ownerRule: StyleRule | null;
    /// [STUB] https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-media
    media: $MediaList;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-title
    title: string;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-alternate-flag
    alternateFlag: boolean;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-disabled-flag
    disabledFlag: boolean;
    /// (STUB) https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-css-rules
    rules: (AtRule | QualifiedRule)[];
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-origin-clean-flag
    originCleanFlag: boolean;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-constructed-flag
    constructedFlag: boolean;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-disallow-modification-flag
    disallowModificationFlag: boolean;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-constructor-document
    constructorDocument: Node | null;
    // https://www.w3.org/TR/2021/WD-cssom-1-20210826/#concept-css-style-sheet-stylesheet-base-url
    stylesheetBaseUrl: URL | null;

    constructor(initOptions: StylesheetInit) {
        this.type = "text/css";
        this.location = initOptions.location;
        this.parentStylesheet = initOptions.parentStylesheet;
        this.ownerNode = initOptions.ownerNode;
        this.ownerRule = initOptions.ownerRule;
        this.media = initOptions.media;
        this.title = initOptions.title;
        this.alternateFlag = initOptions.alternateFlag;
        this.disabledFlag = false;
        this.rules = [];
        this.originCleanFlag = initOptions.originCleanFlag;
        this.constructedFlag = initOptions.constructedFlag;
        this.disallowModificationFlag = false;
        this.constructorDocument = null;
        this.stylesheetBaseUrl = null;
    }
}
