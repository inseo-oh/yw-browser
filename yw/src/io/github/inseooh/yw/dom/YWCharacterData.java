package io.github.inseooh.yw.dom;

public abstract class YWCharacterData extends YWNode {
    private String text = "";

    YWCharacterData(YWDocument nodeDocument) {
        super(nodeDocument);
    }
    
    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}
