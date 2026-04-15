// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import type { TokenStream } from "./syntax.js";

export const PROPERTY_DESCRIPTORS: Map<string, PropertyDescriptor> = new Map();

export interface PropertyDescriptor {
    valueParser: (ts: TokenStream) => unknown;
    inherited: boolean;
    initial: () => unknown;
    computedValue: (parent: unknown, value: unknown) => unknown;
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
        if (
            this.value === "inherit" ||
            (this.descriptor.inherited &&
                (this.value === undefined || this.value === "unset"))
        ) {
            parent = parent ?? this.descriptor.initial();
            return parent;
        } else if (
            this.value === "initial" ||
            this.value === undefined ||
            this.value === "unset"
        ) {
            return this.descriptor.initial();
        }
        parent = parent ?? this.descriptor.initial();
        return this.descriptor.computedValue(parent, this.value);
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
