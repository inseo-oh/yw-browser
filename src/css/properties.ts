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

export interface UnfinalizedPropertyValue {
    apply(set: UnfinalizedPropertySet): void;
    propertyName(): string;
    serialize(): string;
}
export class SimplePropertyValue<T> implements UnfinalizedPropertyValue {
    descriptor: PropertyDescriptor;
    value: T;

    constructor(property: string, value: T) {
        if (
            value instanceof SimplePropertyValue ||
            value instanceof ShorthandPropertyValue
        ) {
            throw new TypeError(
                "attempted to put PropertyValue inside SimplePropertyValue",
            );
        }
        if (value === undefined) {
            throw new TypeError("value cannot be undefined");
        }
        this.descriptor = getPropertyDescriptor(property);
        this.value = value;
    }

    apply(set: UnfinalizedPropertySet): void {
        set.list.set(this.descriptor, this);
    }

    propertyName(): string {
        return this.descriptor.name;
    }
    serialize(): string {
        return this.descriptor.serializeValue(this);
    }
}
export abstract class GlobalKeywordPropertyValue implements UnfinalizedPropertyValue {
    descriptor: PropertyDescriptor;

    constructor(property: string) {
        this.descriptor = getPropertyDescriptor(property);
    }

    apply(set: UnfinalizedPropertySet): void {
        set.list.set(this.descriptor, this);
    }

    propertyName(): string {
        return this.descriptor.name;
    }
    abstract serialize(): string;
}
export class Inherit extends GlobalKeywordPropertyValue {
    serialize(): string {
        return `inherit`;
    }
}
export class Unset extends GlobalKeywordPropertyValue {
    serialize(): string {
        return `unset`;
    }
}
export class Initial extends GlobalKeywordPropertyValue {
    serialize(): string {
        return `initial`;
    }
}
export class ShorthandPropertyValue implements UnfinalizedPropertyValue {
    descriptor: PropertyDescriptor;
    values: UnfinalizedPropertyValue[];

    constructor(property: string, values: UnfinalizedPropertyValue[]) {
        this.descriptor = getPropertyDescriptor(property);
        this.values = values;
    }
    apply(set: UnfinalizedPropertySet): void {
        this.values.forEach((value) => {
            value.apply(set);
        });
    }
    propertyName(): string {
        return this.descriptor.name;
    }
    serialize(): string {
        return `${this.values.map((v) => v.serialize()).join(",")}`;
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
    serializeValue(v: UnfinalizedPropertyValue): string;
}
export class SimplePropertyDescriptor<T> implements PropertyDescriptor {
    name: string;
    inherited: boolean;
    valueParser: (ts: TokenStream) => T | undefined;
    initial: () => T;
    computed: (parent: T, value: T) => T;
    serializer: (v: T) => string;

    constructor({
        name,
        inherited,
        serializer = (v): string => `${v}`,
        valueParser,
        initial,
        computed,
    }: {
        name: string;
        inherited: boolean;
        serializer?: (v: T) => string;
        valueParser: (ts: TokenStream) => T | undefined;
        initial: () => T;
        computed: (parent: T, value: T) => T;
    }) {
        this.name = name;
        this.inherited = inherited;
        this.serializer = serializer;
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
    serializeValue(v: SimplePropertyValue<T>): string {
        return this.serializer(v.value);
    }
}
export abstract class ShorthandPropertyDescriptor implements PropertyDescriptor {
    name: string;
    propertyDescriptors: PropertyDescriptor[];
    hiddenPropertyDescriptors: PropertyDescriptor[];
    inherited: boolean;

    // Hidden properties are properties that gets initialized and inherited,
    // but are not part of the property syntax.
    constructor({
        name,
        propertyNames,
        hiddenPropertyNames,
        inherited,
    }: {
        name: string;
        propertyNames: string[];
        hiddenPropertyNames: string[];
        inherited: boolean;
    }) {
        this.name = name;
        this.inherited = inherited;
        this.propertyDescriptors = propertyNames.map(getPropertyDescriptor);
        this.hiddenPropertyDescriptors = hiddenPropertyNames.map(
            getPropertyDescriptor,
        );
    }
    abstract parse(ts: TokenStream): UnfinalizedPropertyValue | undefined;
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
            this.name,
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
        return new ShorthandPropertyValue(this.name, [
            ...this.propertyDescriptors.map((d) => d.initialValue()),
            ...this.hiddenPropertyDescriptors.map((d) => d.initialValue()),
        ]);
    }
    serializeValue(v: UnfinalizedPropertyValue): string {
        return v.serialize();
    }
}
export class NormalShorthandPropertyDescriptor extends ShorthandPropertyDescriptor {
    constructor({
        name,
        propertyNames,
        hiddenPropertyNames = [],
        inherited,
    }: {
        name: string;
        propertyNames: string[];
        hiddenPropertyNames?: string[];
        inherited: boolean;
    }) {
        super({
            name,
            inherited,
            propertyNames,
            hiddenPropertyNames,
        });
    }
    parse(ts: TokenStream): UnfinalizedPropertyValue | undefined {
        const got = new Map<string, UnfinalizedPropertyValue>();
        mainLoop: while (got.size !== this.propertyDescriptors.length) {
            for (const desc of this.propertyDescriptors) {
                if (!got.has(desc.name)) {
                    ts.skipWhitespaces();
                    // EXCEPTION: If desc is side shorthand, treat it as single value instead.
                    //            (obviously we can't have shorthands inside shorthand)
                    const res =
                        desc instanceof SideShorthandPropertyDescriptor
                            ? new SimplePropertyValue(
                                  desc.name,
                                  desc.innerValueParser(ts),
                              )
                            : desc.parse(ts);
                    if (res !== undefined) {
                        if (!(res instanceof SimplePropertyValue)) {
                            throw new Error(
                                "res must be SimplePropertyValue at this point",
                            );
                        }
                        got.set(desc.name, res);
                        ts.skipWhitespaces();
                        continue mainLoop;
                    }
                }
            }
            // If we've iterated through all properties and still haven't found any, we exit.
            break;
        }
        if (got.size === 0) {
            return undefined;
        }
        // Fill unpopulated ones with initial values.
        for (const desc of this.propertyDescriptors) {
            if (!got.has(desc.name)) {
                // EXCEPTION: If desc is side shorthand, treat it as single value instead.
                //            (obviously we can't have shorthands inside shorthand)
                const initialValue =
                    desc instanceof SideShorthandPropertyDescriptor
                        ? new SimplePropertyValue(
                              desc.name,
                              desc.topPropertyDescriptor.initialValue(),
                          )
                        : desc.initialValue();
                got.set(desc.name, initialValue);
            }
        }
        return new ShorthandPropertyValue(this.name, [...got.values()]);
    }
}
export class SideShorthandPropertyDescriptor extends ShorthandPropertyDescriptor {
    topPropertyDescriptor: PropertyDescriptor;
    rightPropertyDescriptor: PropertyDescriptor;
    bottomPropertyDescriptor: PropertyDescriptor;
    leftPropertyDescriptor: PropertyDescriptor;
    innerValueParser: SimplePropertyDescriptor<unknown>["valueParser"];

    constructor({
        name,
        propertyNames,
        hiddenPropertyNames = [],
        inherited,
    }: {
        name: string;
        propertyNames: {
            top: string;
            right: string;
            bottom: string;
            left: string;
        };
        hiddenPropertyNames?: string[];
        inherited: boolean;
    }) {
        super({
            name,
            inherited,
            propertyNames: [
                propertyNames.top,
                propertyNames.right,
                propertyNames.bottom,
                propertyNames.left,
            ],
            hiddenPropertyNames,
        });
        this.inherited = inherited;
        this.topPropertyDescriptor = getPropertyDescriptor(propertyNames.top);
        this.rightPropertyDescriptor = getPropertyDescriptor(
            propertyNames.right,
        );
        this.bottomPropertyDescriptor = getPropertyDescriptor(
            propertyNames.bottom,
        );
        this.leftPropertyDescriptor = getPropertyDescriptor(propertyNames.left);
        if (this.topPropertyDescriptor instanceof SimplePropertyDescriptor) {
            this.innerValueParser = this.topPropertyDescriptor.valueParser;
        } else {
            throw new TypeError(
                "only properties described by a SimplePropertyDescriptor is allowed",
            );
        }
    }
    parse(ts: TokenStream): UnfinalizedPropertyValue | undefined {
        const values = commaSeparatedRepeation(ts, 1, 4, this.innerValueParser);
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
        return new ShorthandPropertyValue(this.name, res);
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
        if (
            parentValue instanceof ShorthandPropertyValue &&
            parentSet !== undefined
        ) {
            specifiedValue = new ShorthandPropertyValue(
                descriptor.name,
                parentValue.values.map((v): UnfinalizedPropertyValue => {
                    const prop = parentSet.get(v.propertyName());
                    if (prop === undefined) {
                        throw new Error(
                            `parentSet should have property ${v.propertyName()}`,
                        );
                    }
                    return new SimplePropertyValue(v.propertyName(), prop);
                }),
            );
        } else {
            specifiedValue = parentValue;
        }
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
            if (!(descriptor instanceof ShorthandPropertyDescriptor)) {
                return;
            }
            if (propValue === undefined) {
                return;
            }
            const computed = toComputedValue(parentSet, descriptor, propValue);
            computed.apply(this);
        });
        this.list.forEach((propValue, descriptor) => {
            if (descriptor instanceof ShorthandPropertyDescriptor) {
                return;
            }
            const computed = toComputedValue(parentSet, descriptor, propValue);
            if (!(computed instanceof SimplePropertyValue)) {
                throw new Error(
                    "We should have SimplePropertyValue at this point",
                );
            }
            res.set(descriptor.name, computed.value);
        });
        return res;
    }
}
