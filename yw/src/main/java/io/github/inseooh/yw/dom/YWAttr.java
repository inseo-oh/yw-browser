package io.github.inseooh.yw.dom;

public class YWAttr extends YWNode {
    public static class Data {
        public String localName = "";
        public String value = "";
        public String namespace = "";
        public String namespacePrefix = "";
    }

    private final Data data;
    private YWElement element;

    YWAttr(YWDocument nodeDocument, Data data, YWElement element) {
        super(nodeDocument);
        this.data = data;
        this.element = element;
    }

    public String getLocalName() {
        return data.localName;
    }

    public void setLocalName(String localName) {
        data.localName = localName;
    }

    public String getValue() {
        return data.value;
    }

    public void setValue(String value) {
        data.value = value;
    }

    public String getNamespace() {
        return data.namespace;
    }

    public void setNamespace(String namespace) {
        data.namespace = namespace;
    }

    public String getNamespacePrefix() {
        return data.namespacePrefix;
    }

    public void setNamespacePrefix(String namespacePrefix) {
        data.namespacePrefix = namespacePrefix;
    }

    public YWElement getElement() {
        return element;
    }

    public void setElement(YWElement element) {
        this.element = element;
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
}
