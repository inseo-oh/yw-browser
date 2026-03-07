package io.github.inseooh.yw.dom;

public class YWDocumentType extends YWNode {
    private String name;
    private String publicId;
    private String systemId;

    YWDocumentType(YWDocument nodeDocument, String name, String publicId, String systemId) {
        super(nodeDocument);
        this.name = name;
        this.publicId = publicId;
        this.systemId = systemId;
    }

    @Override
    public void runInsertionSteps() {
    }

    @Override
    public void runChildrenChangedSteps() {
    }

    @Override
    public void runPostConnectionSteps() {
    }

    @Override
    public void runAdoptingSteps(YWDocument oldDocument) {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPublicId() {
        return publicId;
    }

    public void setPublicId(String publicId) {
        this.publicId = publicId;
    }

    public String getSystemId() {
        return systemId;
    }

    public void setSystemId(String systemId) {
        this.systemId = systemId;
    }
}
