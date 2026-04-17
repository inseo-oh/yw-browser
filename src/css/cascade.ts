// This file is part of . Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import { Element } from "../dom.js";
import { StyleRule, type CSSStyleSheet, type StyleDeclaration } from "./om.js";
import { UnfinalizedPropertySet, type PropertySet } from "./properties.js";
import { matchSelectorAgainstTree } from "./selector.js";

// https://www.w3.org/TR/css-cascade-4/#cascade-origin

const PRIORITY_TRANSITION = 0; // Highest priority
const PRIORITY_IMPORTANT_USER_AGENT = 1;
const PRIORITY_IMPORTANT_USER = 2;
const PRIORITY_IMPORTANT_AUTHOR = 3;
const PRIORITY_ANIMATION = 4;
const PRIORITY_NORMAL_AUTHOR = 5;
const PRIORITY_NORMAL_USER = 6;
const PRIORITY_NORMAL_USER_AGENT = 7; // Lowest priority

type DeclarationEntry = {
    rule: StyleRule;
    declaration: StyleDeclaration;
};

class PropertySetFinalizer {
    input: Map<Element, UnfinalizedPropertySet>;
    output: Map<Element, PropertySet> = new Map();

    constructor(input: Map<Element, UnfinalizedPropertySet>) {
        this.input = input;
    }

    finalizeForElement(element: Element): PropertySet {
        const propertySet = this.output.get(element);
        if (propertySet !== undefined) {
            return propertySet;
        }
        const parentPropertySet =
            element.parent != null && element.parent instanceof Element
                ? this.finalizeForElement(element.parent)
                : undefined;
        const input = this.input.get(element);
        if (input === undefined) {
            return new Map();
        }
        const result = input.finalize(parentPropertySet);
        this.output.set(element, result);
        return result;
    }

    run(): void {
        for (const entry of this.input.keys()) {
            this.finalizeForElement(entry);
        }
    }
}

export function runCascade(
    uaStyleSheet: CSSStyleSheet,
    rootNode: Element,
): void {
    const declGroups: DeclarationEntry[][] = [
        // Higher priority first, lower priority last
        [], // Transition declarations
        [], // Important user agent declarations
        [], // Important user declarations
        [], // Important author declarations
        [], // Animation declarations
        [], // Normal author declarations
        [], // Normal user declarations
        [], // Normal user agent declarations
    ];

    const elems = [];

    for (const node of rootNode.inclusiveDescendants()) {
        if (node instanceof Element) {
            elems.push(node);
        }
    }

    // User agent declarations -----------------------------------------------------
    for (const rule of uaStyleSheet.cssRules) {
        if (!(rule instanceof StyleRule)) {
            continue;
        }
        for (const declaration of rule.declarations) {
            if (declaration.important) {
                declGroups[PRIORITY_IMPORTANT_USER_AGENT]!.push({
                    rule,
                    declaration,
                });
            } else {
                declGroups[PRIORITY_NORMAL_USER_AGENT]!.push({
                    rule,
                    declaration,
                });
            }
        }
    }

    // Author declarations ---------------------------------------------------------
    for (const sheet of rootNode.styleSheets) {
        for (const rule of sheet.cssRules) {
            if (!(rule instanceof StyleRule)) {
                continue;
            }
            for (const declaration of rule.declarations) {
                if (declaration.important) {
                    declGroups[PRIORITY_IMPORTANT_AUTHOR]!.push({
                        rule,
                        declaration,
                    });
                } else {
                    declGroups[PRIORITY_NORMAL_AUTHOR]!.push({
                        rule,
                        declaration,
                    });
                }
            }
        }
    }

    // Presentational hints --------------------------------------------------------
    for (const elem of elems) {
        for (const rule of elem.onGetPresentationalHints()) {
            for (const declaration of rule.declarations) {
                if (declaration.important) {
                    declGroups[PRIORITY_IMPORTANT_AUTHOR]!.push({
                        rule,
                        declaration,
                    });
                } else {
                    declGroups[PRIORITY_NORMAL_AUTHOR]!.push({
                        rule,
                        declaration,
                    });
                }
            }
        }
    }

    // Apply specificity -----------------------------------------------------------
    // TODO: Apply specificity

    // Apply collected rules -------------------------------------------------------
    const props = new Map();
    for (let i = declGroups.length - 1; 0 <= i; i--) {
        const declGroup = declGroups[i]!;

        for (const declEntry of declGroup) {
            const selectedElements = matchSelectorAgainstTree(
                declEntry.rule.selector,
                rootNode,
            );
            for (const elem of selectedElements) {
                let propertySet = props.get(elem);
                if (propertySet === undefined) {
                    propertySet = new UnfinalizedPropertySet();
                    props.set(elem, propertySet);
                }
                declEntry.declaration.applyStyleRule(propertySet);
            }
        }
    }

    // Finalize property set -------------------------------------------------------
    const finalizer = new PropertySetFinalizer(props);
    finalizer.run();
    finalizer.output.forEach((set, element) => {
        element.cssPropertySet = set;
    });

    // Set default styles for elements without style --------------------------------
    rootNode.inclusiveDescendants().forEach((e) => {
        if (e instanceof Element && e.cssPropertySet === null) {
            e.cssPropertySet = new UnfinalizedPropertySet().finalize(undefined);
        }
    });
}
