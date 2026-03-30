// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import { parseStylesheet, serializeTokens } from "./css/syntax.js";

console.log("tokenizing...");
const parsed = parseStylesheet(`
.foo {}
`);
console.log(serializeTokens(parsed.value));
