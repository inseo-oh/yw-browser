package io.github.inseooh.yw.html;

import java.util.Locale;

import io.github.inseooh.yw.YWNamespaces;
import io.github.inseooh.yw.dom.YWDocument;
import io.github.inseooh.yw.dom.YWElement;

public class YWHTMLElement extends YWElement {
    YWHTMLElement(YWDocument nodeDocument, String namespace, String namespacePrefix, String is, String localName, Object tagToken, CustomElementState customElementState) {
        super(nodeDocument, namespace, namespacePrefix, is, localName, tagToken, customElementState);
    }

    boolean isElement(String localName) {
        return isElement(YWNamespaces.HTML, localName);
    }

    boolean isFormAssociatedCustomElement() {
        // STUB
        return false;
    }

    boolean isFormAssociatedElement() {
        return isFormAssociatedCustomElement() || isElement("button") || isElement("fieldset") || isElement("input") || isElement("object") || isElement("output") || isElement("select") || isElement("textarea") || isElement("img");
    }

    boolean isListedElement() {
        return isFormAssociatedCustomElement() || isElement("button") || isElement("fieldset") || isElement("input") || isElement("object") || isElement("output") || isElement("select") || isElement("textarea");
    }

    boolean isSubmittableElement() {
        return isFormAssociatedCustomElement() || isElement("button") || isElement("input") || isElement("select") || isElement("textarea");
    }

    boolean isResettableElement() {
        return isFormAssociatedCustomElement() || isElement("input") || isElement("output") || isElement("select") || isElement("textarea");
    }

    boolean isAutocapitalizeAndAutocorrectInheritingElement() {
        return isFormAssociatedCustomElement() || isElement("button") || isElement("fieldset") || isElement("input") || isElement("output") || isElement("select") || isElement("textarea");
    }

    boolean isLabelableElement() {
        if (isFormAssociatedCustomElement() || isElement("button") || isElement("meter") || isElement("output") || isElement("progress") || isElement("select") || isElement("textarea")) {
            return true;
        }
        return isElement("input") && getAttr("type") != null && !getAttr("type").toLowerCase(Locale.ROOT).equals("hidden");
    }

    boolean contributesScriptBlockingStylesheet() {
        // STUB
        return false;
    }

}
