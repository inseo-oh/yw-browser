// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

//==========================================================================
// Referrer Policy - 3.
//==========================================================================
export type ReferrerPolicy =
    | ""
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "same-origin"
    | "origin"
    | "strict-origin"
    | "origin-when-cross-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";

// https://w3c.github.io/webappsec-referrer-policy/#default-referrer-policy
// NOTE: This is from Editor's Draft. The link may not work in the future!
export const DEFAULT_REFERRER_POLICY: ReferrerPolicy =
    "strict-origin-when-cross-origin";
