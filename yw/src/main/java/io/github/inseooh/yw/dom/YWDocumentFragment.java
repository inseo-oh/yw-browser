package io.github.inseooh.yw.dom;

public class YWDocumentFragment extends YWNode {
    private YWNode host;

    YWDocumentFragment(YWDocument nodeDocument, YWNode host) {
        super(nodeDocument);
        this.host = host;
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

    public YWNode getHost() {
        return host;
    }

    public void setHost(YWNode host) {
        this.host = host;
    }
}
