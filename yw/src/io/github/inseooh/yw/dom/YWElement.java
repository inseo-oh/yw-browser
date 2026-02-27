package io.github.inseooh.yw.dom;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.html.customelements.YWCustomElementRegistry;

public class YWElement extends YWNode {

    private String namespace; /* May be null */
    private String prefix; /* May be null */
    private String is;
    private String localName;
    private YWCustomElementRegistry customElementRegistry = null; /* May be null */
    private YWShadowRoot shadowRoot = null;
    private final List<YWAttr> attrs = new ArrayList<>();
    private Object tagToken;
    private CustomElementState customElementState;

    public YWElement(YWDocument nodeDocument, String namespace, String namespacePrefix, String is, String localName, Object tagToken, CustomElementState customElementState) {
        super(nodeDocument);
        this.namespace = namespace;
        this.prefix = namespacePrefix;
        this.is = is;
        this.localName = localName;
    }

    public String getNamespace() {
        return namespace;
    }

    public void setNamespace(String namespace) {
        this.namespace = namespace;
    }

    public String getIs() {
        return is;
    }

    public void setIs(String is) {
        this.is = is;
    }

    public String getPrefix() {
        return prefix;
    }

    public void setPrefix(String prefix) {
        this.prefix = prefix;
    }

    public String getLocalName() {
        return localName;
    }

    public void setLocalName(String localName) {
        this.localName = localName;
    }

    public YWCustomElementRegistry getCustomElementRegistry() {
        return customElementRegistry;
    }

    public void setCustomElementRegistry(YWCustomElementRegistry customElementRegistry) {
        this.customElementRegistry = customElementRegistry;
    }

    public YWShadowRoot getShadowRoot() {
        return shadowRoot;
    }

    public void setShadowRoot(YWShadowRoot shadowRoot) {
        this.shadowRoot = shadowRoot;
    }

    public List<YWAttr> getAttrs() {
        return attrs;
    }

    public Object getTagToken() {
        return tagToken;
    }

    public void setTagToken(Object tagToken) {
        this.tagToken = tagToken;
    }

    public CustomElementState getCustomElementState() {
        return customElementState;
    }

    public void setCustomElementState(CustomElementState customElementState) {
        this.customElementState = customElementState;
    }

    /**
     * Returns whether the element is shadow host.
     *
     * @return true if the element is shadow host.
     * @see <a href="https://dom.spec.whatwg.org/#element-shadow-host">Relevant section in DOM specification</a>
     */
    public boolean isShadowHost() {
        return this.shadowRoot != null;
    }

    /**
     * Returns whether the element is defined.
     *
     * @return true if the element is defined.
     * @see <a href="https://dom.spec.whatwg.org/#concept-element-defined">Relevant section in DOM specification</a>
     */
    public boolean isDefined() {
        return customElementState == CustomElementState.UNCUSTOMIZED || customElementState == CustomElementState.CUSTOM;
    }

    /**
     * Returns whether the element is custom.
     *
     * @return true if the element is custom.
     * @see <a href="https://dom.spec.whatwg.org/#concept-element-custom">Relevant section in DOM specification</a>
     */
    public boolean isCustom() {
        return customElementState == CustomElementState.CUSTOM;
    }

    public boolean isInside(String namespace, String localName) {
        YWNode current = this.getParent();
        while (current != null) {
            if (!(current instanceof YWElement)) {
                break;
            }
            if (((YWElement) current).isElement(namespace, localName)) {
                return true;
            }
            current = current.getParent();
        }
        return false;
    }

    public boolean isElement(String namespace, String localName) {
        return this.namespace != null && this.namespace.equals(namespace) && this.localName.equals(localName);
    }

    public void appendAttr(YWAttr.Data data) {
        YWAttr attr = new YWAttr(this.getNodeDocument(), data, this);
    }

    /**
     * Finds an attribute in the element.
     *
     * @param namespace Namespace of attribute or null. If null, attributes with namespace will not be matched, and if it's non-null, attributes without namespace will not be matched.
     * @param localName Local name of the attribute.
     * @return Value of the attribute, or null if not found.
     */
    public String getAttr(String namespace, String localName) {
        for (YWAttr attr : attrs) {
            if (((namespace == null && attr.getNamespace() == null) || (namespace != null && attr.getNamespace().equals(namespace))) && attr.getLocalName().equals(localName)) {
                return attr.getValue();
            }
        }
        return null;
    }

    /**
     * Finds an attribute in the element. Attributes with namespace will not be matched.
     *
     * @param localName Local name of the attribute.
     * @return Value of the attribute, or null if not found.
     */
    public String getAttr(String localName) {
        return getAttr(null, localName);
    }

    @Override
    void runInsertionSteps() {
    }

    @Override
    void runChildrenChangedSteps() {
    }

    @Override
    void runPostConnectionSteps() {
    }

    @Override
    void runAdoptingSteps(YWDocument oldDocument) {
    }

    /**
     * Represents custom element state of the element.
     *
     * @see <a href="https://dom.spec.whatwg.org/#concept-element-custom-element-state">Relevant section in DOM specification</a>
     */
    public enum CustomElementState {
        UNDEFINED, FAILED, UNCUSTOMIZED, PRECUSTOMIZED, CUSTOM
    }
}
