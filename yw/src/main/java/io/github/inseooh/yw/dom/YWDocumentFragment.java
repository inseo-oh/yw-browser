package io.github.inseooh.yw.dom;

public class YWDocumentFragment extends YWNode {
    private YWNode host;

    YWDocumentFragment(YWDocument nodeDocument, YWNode host) {
        super(nodeDocument);
        this.host = host;
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

    public YWNode getHost() {
        return host;
    }

    public void setHost(YWNode host) {
        this.host = host;
    }
}
