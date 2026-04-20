// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import { Element, type Document } from "../dom.js";
import { HTML_NAMESPACE, toASCIILowercase } from "../infra.js";

//==============================================================================
// HTML Standard - 2.3.3.
//==============================================================================

// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#enumerated-attribute
export function enumeratedAttribute<T>(
    element: Element,
    attributeName: string,
    {
        missingValueDefault,
        emptyValueDefault,
        invalidValueDefault,
    }: {
        missingValueDefault?: T;
        emptyValueDefault?: T;
        invalidValueDefault?: T;
    },
    tryMatch: (value: string) => T | undefined,
): T | undefined {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.05)

    // S1.
    const attrValue = element.attribute(null, attributeName);
    if (attrValue === undefined) {
        // S1-1.
        if (missingValueDefault !== undefined) {
            return missingValueDefault;
        }

        // S1-2.
        return undefined;
    }

    // S2.
    const res = tryMatch(toASCIILowercase(attrValue));
    if (res !== undefined) {
        return res;
    }

    // S3.
    if (emptyValueDefault !== undefined && attrValue === "") {
        return emptyValueDefault;
    }

    // S4.
    if (invalidValueDefault !== undefined) {
        return invalidValueDefault;
    }

    // S5.
    return undefined;
}

//==============================================================================
// HTML Standard - 2.4.
//==============================================================================

// https://html.spec.whatwg.org/multipage/urls-and-fetching.html#matches-about:blank
function matchesAboutBlank(url: URL): boolean {
    return (
        url.protocol === "about:" &&
        url.pathname === "blank" &&
        url.username === "" &&
        url.password === "" &&
        url.host === ""
    );
}

//==============================================================================
// HTML Standard - 2.4.3.
//==============================================================================

// https://html.spec.whatwg.org/multipage/urls-and-fetching.html#document-base-url
export function documentBaseURL(document: Document): URL {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.07.)

    // S1.
    let baseElement = null;
    for (const elem of document.descendants()) {
        if (
            elem instanceof Element &&
            elem.isElement(HTML_NAMESPACE, "base") &&
            elem.attribute(null, "href") != null
        ) {
            baseElement = elem;
        }
    }
    if (baseElement == null) {
        return fallbackBaseURL(document);
    }

    // S2.
    // TODO: S2

    throw new Error("TODO");
}

// https://html.spec.whatwg.org/multipage/urls-and-fetching.html#fallback-base-url
function fallbackBaseURL(document: Document): URL {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.07.)

    // S1.
    if (document.isIframeSrcdocDocument) {
        // S1-1.
        if (document.aboutBaseURL === null) {
            throw new Error("aboutBaseURL should not be null at this point");
        }

        // S1-2.
        return document.aboutBaseURL;
    }

    // S2.
    if (matchesAboutBlank(document.url) && document.aboutBaseURL != null) {
        return document.aboutBaseURL;
    }

    // S3.
    return document.url;
}
