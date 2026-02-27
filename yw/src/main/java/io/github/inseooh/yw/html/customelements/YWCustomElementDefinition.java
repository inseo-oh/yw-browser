package io.github.inseooh.yw.html.customelements;

public class YWCustomElementDefinition {
    private String name;
    private String localName;

    public YWCustomElementDefinition(String name, String localName) {
        this.name = name;
        this.localName = localName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocalName() {
        return localName;
    }

    public void setLocalName(String localName) {
        this.localName = localName;
    }
}
