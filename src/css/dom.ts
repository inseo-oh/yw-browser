// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

// Set of interfaces to make sure our CSS modules don't reference the DOM module directly.

export interface CSSDOMNode {}
export interface CSSDOMDocument extends CSSDOMNode {}
export interface CSSDOMElement extends CSSDOMNode {
    localName: string;

    attribute(namespace: string | null, localName: string): string | undefined;
    index(): number;
}
