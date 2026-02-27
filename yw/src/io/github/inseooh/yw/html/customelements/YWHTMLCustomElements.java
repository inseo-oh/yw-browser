package io.github.inseooh.yw.html.customelements;

import io.github.inseooh.yw.dom.YWElement;

public class YWHTMLCustomElements {
    public static void tryUpgradeElement(YWElement element) {
        String ns = element.getNamespace();
        String is = element.getIs();
        YWCustomElementDefinition definition = element.getCustomElementRegistry().lookupCustomElementDefinition(ns, element.getLocalName(), is);
        if (definition != null) {
            // TODO: enqueue a custom element upgrade reaction given element and definition.
            throw new RuntimeException("TODO[https://html.spec.whatwg.org/multipage/custom-elements.html#concept-try-upgrade]");
        }
    }
}
