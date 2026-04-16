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
export function registerPropertyDescriptor(
    ...descriptors: PropertyDescriptor[]
): void {
    for (const descriptor of descriptors) {
        PROPERTY_DESCRIPTORS.set(descriptor.name, descriptor);
    }
}

export interface PropertyDescriptor {
    name: string;
    inherited: boolean;
    initialValue(): UnfinalizedPropertyValue;
    computedValue(
        parent: UnfinalizedPropertyValue,
        value: UnfinalizedPropertyValue,
    ): UnfinalizedPropertyValue;
    parse(ts: TokenStream): UnfinalizedPropertyValue | undefined;
}
export class SimplePropertyDescriptor<T> implements PropertyDescriptor {
    name: string;
    inherited: boolean;
    valueParser: (ts: TokenStream) => T | undefined;
    initial: () => T;
    computed: (parent: T, value: T) => T;

    constructor({
        name,
        inherited,
        valueParser,
        initial,
        computed,
    }: {
        name: string;
        inherited: boolean;
        valueParser: (ts: TokenStream) => T | undefined;
        initial: () => T;
        computed: (parent: T, value: T) => T;
    }) {
        this.name = name;
        this.inherited = inherited;
        this.valueParser = valueParser;
        this.initial = initial;
        this.computed = computed;
    }

    initialValue(): UnfinalizedPropertyValue {
        return new SimplePropertyValue(this.name, this.initial());
    }
    computedValue(
        parent: UnfinalizedPropertyValue,
        value: UnfinalizedPropertyValue,
    ): UnfinalizedPropertyValue {
        if (!(parent instanceof SimplePropertyValue)) {
            throw new TypeError("parent must be SimplePropertyValue");
        }
        if (!(value instanceof SimplePropertyValue)) {
            throw new TypeError("value must be SimplePropertyValue");
        }
        return new SimplePropertyValue(
            this.name,
            this.computed(parent.value, value.value),
        );
    }
    parse(ts: TokenStream): UnfinalizedPropertyValue | undefined {
        const v = this.valueParser(ts);
        if (v === undefined) {
            return undefined;
        }
        return new SimplePropertyValue(this.name, v);
    }
}
export interface UnfinalizedPropertyValue {
    apply(set: UnfinalizedPropertySet): void;
}
export class SimplePropertyValue<T> implements UnfinalizedPropertyValue {
    descriptor: PropertyDescriptor;
    value: T;

    constructor(property: string, value: T) {
        this.descriptor = getPropertyDescriptor(property);
        this.value = value;
    }

    apply(set: UnfinalizedPropertySet): void {
        set.list.set(this.descriptor, this);
    }
}
export class GlobalKeywordPropertyValue implements UnfinalizedPropertyValue {
    descriptor: PropertyDescriptor;

    constructor(property: string) {
        this.descriptor = getPropertyDescriptor(property);
    }

    apply(set: UnfinalizedPropertySet): void {
        set.list.set(this.descriptor, this);
    }
}
export class Inherit extends GlobalKeywordPropertyValue {}
export class Unset extends GlobalKeywordPropertyValue {}
export class Initial extends GlobalKeywordPropertyValue {}

export class ShorthandPropertyValue implements UnfinalizedPropertyValue {
    values: UnfinalizedPropertyValue[];

    constructor(values: UnfinalizedPropertyValue[]) {
        this.values = values;
    }
    apply(set: UnfinalizedPropertySet): void {
        this.values.forEach((value) => {
            value.apply(set);
        });
    }
}
export class SideShorthandPropertyDescriptor implements PropertyDescriptor {
    name: string;
    topPropertyDescriptor: PropertyDescriptor;
    rightPropertyDescriptor: PropertyDescriptor;
    bottomPropertyDescriptor: PropertyDescriptor;
    leftPropertyDescriptor: PropertyDescriptor;
    inherited: boolean;
    #innerValueParser: SimplePropertyDescriptor<unknown>["valueParser"];

    constructor({
        name,
        topName: topPropertyName,
        rightName: rightPropertyName,
        bottomName: bottomPropertyName,
        leftName: leftPropertyName,
        inherited,
    }: {
        name: string;
        topName: string;
        rightName: string;
        bottomName: string;
        leftName: string;
        inherited: boolean;
    }) {
        this.name = name;
        this.inherited = inherited;
        this.topPropertyDescriptor = getPropertyDescriptor(topPropertyName);
        this.rightPropertyDescriptor = getPropertyDescriptor(rightPropertyName);
        this.bottomPropertyDescriptor =
            getPropertyDescriptor(bottomPropertyName);
        this.leftPropertyDescriptor = getPropertyDescriptor(leftPropertyName);
        if (this.topPropertyDescriptor instanceof SimplePropertyDescriptor) {
            this.#innerValueParser = this.topPropertyDescriptor.valueParser;
        } else {
            throw new TypeError(
                "only properties described by a SimplePropertyDescriptor is allowed",
            );
        }
    }
    parse(ts: TokenStream): UnfinalizedPropertyValue | undefined {
        const values = commaSeparatedRepeation(
            ts,
            1,
            4,
            this.#innerValueParser,
        );
        if (values === undefined) {
            return undefined;
        }
        let res: UnfinalizedPropertyValue[];
        switch (values.length) {
            case 1:
                res = [
                    new SimplePropertyValue(
                        this.topPropertyDescriptor.name,
                        values[0]!,
                    ),
                    new SimplePropertyValue(
                        this.rightPropertyDescriptor.name,
                        values[0]!,
                    ),
                    new SimplePropertyValue(
                        this.bottomPropertyDescriptor.name,
                        values[0]!,
                    ),
                    new SimplePropertyValue(
                        this.leftPropertyDescriptor.name,
                        values[0]!,
                    ),
                ];
                break;
            case 2:
                res = [
                    new SimplePropertyValue(
                        this.topPropertyDescriptor.name,
                        values[0]!,
                    ),
                    new SimplePropertyValue(
                        this.rightPropertyDescriptor.name,
                        values[1]!,
                    ),
                    new SimplePropertyValue(
                        this.bottomPropertyDescriptor.name,
                        values[0]!,
                    ),
                    new SimplePropertyValue(
                        this.leftPropertyDescriptor.name,
                        values[1]!,
                    ),
                ];
                break;
            case 3:
                res = [
                    new SimplePropertyValue(
                        this.topPropertyDescriptor.name,
                        values[0]!,
                    ),
                    new SimplePropertyValue(
                        this.rightPropertyDescriptor.name,
                        values[1]!,
                    ),
                    new SimplePropertyValue(
                        this.bottomPropertyDescriptor.name,
                        values[2]!,
                    ),
                    new SimplePropertyValue(
                        this.leftPropertyDescriptor.name,
                        values[1]!,
                    ),
                ];
                break;
            case 4:
                res = [
                    new SimplePropertyValue(
                        this.topPropertyDescriptor.name,
                        values[0]!,
                    ),
                    new SimplePropertyValue(
                        this.rightPropertyDescriptor.name,
                        values[1]!,
                    ),
                    new SimplePropertyValue(
                        this.bottomPropertyDescriptor.name,
                        values[2]!,
                    ),
                    new SimplePropertyValue(
                        this.leftPropertyDescriptor.name,
                        values[3]!,
                    ),
                ];
                break;
            default:
                throw new Error("unreachable");
        }
        return new ShorthandPropertyValue(res);
    }
    computedValue(
        parent: UnfinalizedPropertyValue,
        value: UnfinalizedPropertyValue,
    ): UnfinalizedPropertyValue {
        if (!(parent instanceof ShorthandPropertyValue)) {
            throw new TypeError("parent must be ShorthandPropertyValue");
        }
        if (!(value instanceof ShorthandPropertyValue)) {
            throw new TypeError("value must be ShorthandPropertyValue");
        }
        return new ShorthandPropertyValue(
            value.values.map((propertyValue, i) => {
                const parentValue = parent.values[i]!;
                if (parentValue === undefined) {
                    throw new TypeError(
                        "parent and value must have same number of values",
                    );
                }
                if (!(propertyValue instanceof SimplePropertyValue)) {
                    throw new TypeError(
                        "Only SimplePropertyValue is supported",
                    );
                }
                return propertyValue.descriptor.computedValue(
                    parentValue,
                    propertyValue,
                );
            }),
        );
    }
    initialValue(): UnfinalizedPropertyValue {
        return new ShorthandPropertyValue([
            new SimplePropertyValue(
                this.topPropertyDescriptor.name,
                this.topPropertyDescriptor.initialValue(),
            ),
            new SimplePropertyValue(
                this.rightPropertyDescriptor.name,
                this.rightPropertyDescriptor.initialValue(),
            ),
            new SimplePropertyValue(
                this.bottomPropertyDescriptor.name,
                this.bottomPropertyDescriptor.initialValue(),
            ),
            new SimplePropertyValue(
                this.leftPropertyDescriptor.name,
                this.leftPropertyDescriptor.initialValue(),
            ),
        ]);
    }
}

export type PropertySet = Map<string, unknown>;

function toComputedValue(
    parentSet: PropertySet | undefined,
    descriptor: PropertyDescriptor,
    propValue: UnfinalizedPropertyValue | undefined,
): UnfinalizedPropertyValue {
    let specifiedValue: UnfinalizedPropertyValue;
    const parentValueRaw = parentSet?.get(descriptor.name);
    const parentValue =
        parentValueRaw === undefined
            ? descriptor.initialValue()
            : new SimplePropertyValue(descriptor.name, parentValueRaw);
    if (
        propValue instanceof Inherit ||
        (descriptor.inherited &&
            (propValue === undefined || propValue instanceof Unset))
    ) {
        specifiedValue = parentValue;
    } else if (
        propValue instanceof Initial ||
        propValue === undefined ||
        propValue instanceof Unset
    ) {
        specifiedValue = descriptor.initialValue();
    } else if (propValue instanceof SimplePropertyValue) {
        specifiedValue = propValue;
    } else {
        throw new Error(`unrecognized value ${propValue}`);
    }
    return descriptor.computedValue(parentValue, specifiedValue);
}
export class UnfinalizedPropertySet {
    list: Map<PropertyDescriptor, UnfinalizedPropertyValue | undefined> =
        new Map();

    constructor() {
        PROPERTY_DESCRIPTORS.forEach((descriptor) => {
            this.list.set(descriptor, undefined);
        });
    }

    finalize(parentSet: PropertySet | undefined): PropertySet {
        const res = new Map();
        this.list.forEach((propValue, descriptor) => {
            if (!(descriptor instanceof SideShorthandPropertyDescriptor)) {
                return;
            }
            const computed = toComputedValue(parentSet, descriptor, propValue);
            computed.apply(this);
        });
        this.list.forEach((propValue, descriptor) => {
            if (descriptor instanceof SideShorthandPropertyDescriptor) {
                return;
            }
            res.set(
                descriptor,
                toComputedValue(parentSet, descriptor, propValue),
            );
        });
        return res;
    }
}
