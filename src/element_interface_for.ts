import { Element, type ElementInterface } from "./dom.js";
import { elementInterfaceForHTML } from "./html/elements.js";
import { HTML_NAMESPACE } from "./infra.js";

// https://dom.spec.whatwg.org/#concept-element-interface
export default function elementInterfaceFor(
    namespace: string | null,
    localName: string,
): ElementInterface {
    switch (namespace) {
        case HTML_NAMESPACE:
            return elementInterfaceForHTML(localName);
        default:
            return (n, a) => new Element(n, a);
    }
}
