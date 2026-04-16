// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import type { TokenStream } from "./syntax.js";
import { commaSeparatedRepeation } from "./values.js";

export const PROPERTY_DESCRIPTORS: Map<string, PropertyDescriptor> = new Map();

function getPropertyDescriptor(name: string): PropertyDescriptor {
    const desc = PROPERTY_DESCRIPTORS.get(name);
    if (desc === undefined) {
        throw new Error(`No such property named ${name}`);
    }
    return desc;
}

export interface PropertyDescriptor {
    valueParser(ts: TokenStream): unknown;
    inherited: boolean;
    initial(): unknown;
    computedValue(parent: unknown, value: unknown): unknown;
}
export class ShorthandPropertyValue {
    values: Map<string, [unknown, PropertyDescriptor]>;

    constructor(values: Map<string, unknown>) {
        const newValues = new Map();
        values.forEach((value, property) => {
            const desc = PROPERTY_DESCRIPTORS.get(property);
            if (desc === undefined) {
                throw new Error(`No such property named ${property}`);
            }
            newValues.set(property, [value, desc]);
        });
        this.values = newValues;
    }
    apply(set: UnfinalizedPropertySet): void {
        this.values.forEach((value, property) => {
            if (value instanceof ShorthandPropertyValue) {
                value.apply(set);
            } else {
                const prop = set.list.get(property);
                if (prop === undefined) {
                    throw new Error(`No such property named ${property}`);
                }
                prop.value = value;
            }
        });
    }
}
export class SideShorthandPropertyDescriptor implements PropertyDescriptor {
    topPropertyName: string;
    rightPropertyName: string;
    bottomPropertyName: string;
    leftPropertyName: string;
    topPropertyDescriptor: PropertyDescriptor;
    rightPropertyDescriptor: PropertyDescriptor;
    bottomPropertyDescriptor: PropertyDescriptor;
    leftPropertyDescriptor: PropertyDescriptor;
    inherited: boolean;
    #innerValueParser: PropertyDescriptor["valueParser"];

    constructor({
        topPropertyName,
        rightPropertyName,
        bottomPropertyName,
        leftPropertyName,
        inherited,
    }: {
        topPropertyName: string;
        rightPropertyName: string;
        bottomPropertyName: string;
        leftPropertyName: string;
        inherited: boolean;
    }) {
        this.topPropertyName = topPropertyName;
        this.rightPropertyName = rightPropertyName;
        this.bottomPropertyName = bottomPropertyName;
        this.leftPropertyName = leftPropertyName;
        this.inherited = inherited;
        this.topPropertyDescriptor = getPropertyDescriptor(topPropertyName);
        this.rightPropertyDescriptor = getPropertyDescriptor(rightPropertyName);
        this.bottomPropertyDescriptor =
            getPropertyDescriptor(bottomPropertyName);
        this.leftPropertyDescriptor = getPropertyDescriptor(leftPropertyName);
        if (
            this.topPropertyDescriptor.valueParser !=
                this.rightPropertyDescriptor.valueParser ||
            this.topPropertyDescriptor.valueParser !=
                this.bottomPropertyDescriptor.valueParser ||
            this.topPropertyDescriptor.valueParser !=
                this.leftPropertyDescriptor.valueParser
        ) {
            throw new Error("All properties must share the same valueParser");
        }
        this.#innerValueParser = this.topPropertyDescriptor.valueParser;
    }
    valueParser(ts: TokenStream): unknown {
        const values = commaSeparatedRepeation(
            ts,
            1,
            4,
            this.#innerValueParser,
        );
        if (values === undefined) {
            return undefined;
        }
        const res = new Map();
        switch (values.length) {
            case 1:
                res.set(this.topPropertyName, values[0]!);
                res.set(this.rightPropertyName, values[0]!);
                res.set(this.bottomPropertyName, values[0]!);
                res.set(this.leftPropertyName, values[0]!);
                break;
            case 2:
                res.set(this.topPropertyName, values[0]!);
                res.set(this.rightPropertyName, values[1]!);
                res.set(this.bottomPropertyName, values[0]!);
                res.set(this.leftPropertyName, values[1]!);
                break;
            case 3:
                res.set(this.topPropertyName, values[0]!);
                res.set(this.rightPropertyName, values[1]!);
                res.set(this.bottomPropertyName, values[2]!);
                res.set(this.leftPropertyName, values[1]!);
                break;
            case 4:
                res.set(this.topPropertyName, values[0]!);
                res.set(this.rightPropertyName, values[1]!);
                res.set(this.bottomPropertyName, values[2]!);
                res.set(this.leftPropertyName, values[3]!);
                break;
        }
        return new ShorthandPropertyValue(res);
    }
    computedValue(parent: unknown, value: unknown): unknown {
        if (!(parent instanceof ShorthandPropertyValue)) {
            throw new Error("parent must be ShorthandPropertyValue");
        }
        if (!(value instanceof ShorthandPropertyValue)) {
            throw new Error("parent must be ShorthandPropertyValue");
        }
        const res = new Map();
        value.values.forEach(([value, propertyDescriptor], property) => {
            const parentV = parent.values.get(property);
            if (parentV === undefined) {
                throw new Error(
                    `parent doesn't have value for property ${property}`,
                );
            }
            res.set(
                property,
                propertyDescriptor.computedValue(parentV[1], value),
            );
        });
        return res;
    }
    initial(): unknown {
        const res = new Map();
        res.set(this.topPropertyName, this.topPropertyDescriptor.initial());
        res.set(this.rightPropertyName, this.rightPropertyDescriptor.initial());
        res.set(
            this.bottomPropertyName,
            this.bottomPropertyDescriptor.initial(),
        );
        res.set(this.leftPropertyName, this.leftPropertyDescriptor.initial());
        return new ShorthandPropertyValue(res);
    }
}

export class UnfinalizedProperty {
    value: unknown | "inherit" | "initial" | "unset" | undefined;
    descriptor: PropertyDescriptor;

    constructor(
        value: unknown | "inherit" | "initial" | "unset" | undefined,
        descriptor: PropertyDescriptor,
    ) {
        this.value = value;
        this.descriptor = descriptor;
    }

    finalize(parent: unknown): unknown {
        let finalValue = this.value;
        parent = parent ?? this.descriptor.initial();
        if (
            this.value === "inherit" ||
            (this.descriptor.inherited &&
                (this.value === undefined || this.value === "unset"))
        ) {
            finalValue = parent;
        } else if (
            this.value === "initial" ||
            this.value === undefined ||
            this.value === "unset"
        ) {
            finalValue = this.descriptor.initial();
        }
        return this.descriptor.computedValue(parent, finalValue);
    }
}

export type PropertySet = Map<string, unknown>;

export class UnfinalizedPropertySet {
    list: Map<string, UnfinalizedProperty> = new Map();

    constructor() {
        PROPERTY_DESCRIPTORS.forEach((descriptor, key) => {
            this.list.set(key, new UnfinalizedProperty(undefined, descriptor));
        });
    }

    finalize(parentSet: PropertySet | undefined): PropertySet {
        const res = new Map();
        this.list.forEach((prop, key) => {
            const parentValue = parentSet?.get(key);
            res.set(key, prop.finalize(parentValue));
        });
        return res;
    }
}
