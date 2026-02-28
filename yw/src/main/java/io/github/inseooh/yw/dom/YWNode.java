package io.github.inseooh.yw.dom;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import io.github.inseooh.yw.html.customelements.YWCustomElementRegistry;
import io.github.inseooh.yw.html.customelements.YWHTMLCustomElements;

public abstract class YWNode {
    private final List<YWNode> children = new ArrayList<>();
    private YWNode parent = null;
    private YWDocument nodeDocument;

    abstract void runInsertionSteps();

    abstract void runChildrenChangedSteps();

    abstract void runPostConnectionSteps();

    abstract void runAdoptingSteps(YWDocument oldDocument);

    YWNode(YWDocument nodeDocument) {
        this.nodeDocument = nodeDocument;
    }

    List<YWNode> getChildren() {
        return children;
    }

    public YWNode getParent() {
        return parent;
    }

    public void setParent(YWNode parent) {
        this.parent = parent;
    }

    public YWDocument getNodeDocument() {
        return nodeDocument;
    }

    public  void setNodeDocument(YWDocument nodeDocument) {
        this.nodeDocument = nodeDocument;
    }

    YWNode getFirstChild() {
        if (children.isEmpty()) {
            return null;
        }
        return children.get(0);
    }

    YWNode getLastChild() {
        if (children.isEmpty()) {
            return null;
        }
        return children.get(0);
    }

    /**
     * Returns next sibling of the node.
     *
     * @return The next sibling, or null if it has no parent or is the last child.
     * @see <a href="https://dom.spec.whatwg.org/#concept-tree-next-sibling">Relevant section in DOM specification</a>
     */
    YWNode getNextSibling() {
        if (parent == null) {
            return null;
        }
        int idx = getIndex();
        if (idx == parent.children.size() - 1) {
            return null;
        }
        return parent.children.get(idx + 1);
    }

    /**
     * Returns previous sibling of the node.
     *
     * @return The previous sibling, or null if it has no parent or is the last child.
     * @see <a href="https://dom.spec.whatwg.org/#concept-tree-previous-sibling">Relevant section in DOM specification</a>
     */
    YWNode getPrevSibling() {
        if (parent == null) {
            return null;
        }
        int idx = getIndex();
        if (idx == 0) {
            return null;
        }
        return parent.children.get(idx - 1);
    }

    /**
     * Returns root of the node.
     *
     * @return The root node.
     * @see <a href="https://dom.spec.whatwg.org/#concept-tree-root">Relevant section in DOM specification</a>
     */
    YWNode getRoot() {
        YWNode res = this;
        while (res.parent != null) {
            res = res.parent;
        }
        return res;
    }

    /**
     * Reports whether two nodes share the same root.
     *
     * @param other other node to compare against
     * @return true if two nodes have the same root.
     */
    boolean inTheSameTreeAs(YWNode other) {
        return getRoot() == other.getRoot();
    }

    /**
     * Returns index of the node in the parent.
     *
     * @return Index of the node.
     * @see <a href="https://dom.spec.whatwg.org/#concept-tree-index">Relevant section in DOM specification</a>
     */
    int getIndex() {
        if (parent == null) {
            return 0;
        }
        for (int i = 0; i < children.size(); i++) {
            if (children.get(i) == this) {
                return i;
            }
        }
        throw new RuntimeException("not a children");
    }

    /**
     * Returns [inclusive descendant] nodes of this node.
     *
     * @return Array of inclusive descendant nodes, in tree order.
     * @see <a href="https://dom.spec.whatwg.org/#concept-tree-inclusive-descendant">Relevant section in DOM specification</a>
     */
    YWNode[] getInclusiveDescendants() {
        // In a nutshell: It's just DFS search.
        List<YWNode> resNodes = new ArrayList<>();
        YWNode lastNode = null;

        while (true) {
            YWNode currNode = lastNode;
            YWNode res;

            if (currNode == null) {
                // This is our first call
                res = this;
            } else {
                if (currNode.children.isEmpty()) {
                    // We don't have any more children
                    res = null;
                } else {
                    // Go to the first children
                    res = currNode.children.get(0);
                }
                // If we don't have more children, move to the next sibling
                while (res == null) {
                    res = currNode.getNextSibling();
                    if (res != null) {
                        break;
                    }
                    // We don't even have the next sibling -> Move to the parent
                    currNode = currNode.parent;
                    if (currNode == this || currNode == null) {
                        // We don't have parent, or we are currently at root. We stop here.
                        res = null;
                        break;
                    }
                }

            }
            if (res == null) {
                break;
            }
            lastNode = res;
            resNodes.add(res);
        }
        return resNodes.toArray(new YWNode[0]);
    }

    /**
     * Returns [descendant] nodes of this node.
     *
     * @return Array of descendant nodes, in tree order.
     * @see <a href="https://dom.spec.whatwg.org/#concept-tree-descendant">Relevant section in DOM specification</a>
     */
    YWNode[] getDescendants() {
        YWNode[] nodes = getInclusiveDescendants();
        List<YWNode> resNodes = new ArrayList<>(Arrays.asList(nodes).subList(1, nodes.length));
        return resNodes.toArray(new YWNode[0]);
    }

    /**
     * Returns [inclusive ancestor] nodes of this node.
     *
     * @return Array of inclusive ancestor nodes, in tree order.
     * @see <a href="https://dom.spec.whatwg.org/#concept-tree-inclusive-ancestor">Relevant section in DOM specification</a>
     */
    YWNode[] getInclusiveAncestors() {
        List<YWNode> resNodes = new ArrayList<>();
        resNodes.add(this);

        YWNode p = this;
        while (p.parent != null) {
            p = p.parent;
            resNodes.add(p);
        }
        return resNodes.toArray(new YWNode[0]);
    }

    /**
     * Returns [ancestor] nodes of this node.
     *
     * @return Array of ancestor nodes, in tree order.
     * @see <a href="https://dom.spec.whatwg.org/#concept-tree-ancestor">Relevant section in DOM specification</a>
     */
    YWNode[] getAncestors() {
        YWNode[] nodes = getInclusiveAncestors();
        List<YWNode> resNodes = new ArrayList<>(Arrays.asList(nodes).subList(1, nodes.length));
        return resNodes.toArray(new YWNode[0]);
    }

    /**
     * Same as {@link #getRoot()}, except it also follows host of {@link YWShadowRoot} objects.
     *
     * @return Shadow-including root of the node.
     * @see <a href="https://dom.spec.whatwg.org/#concept-shadow-including-root">Relevant section in DOM specification</a>
     */
    YWNode getShadowIncludingRoot() {
        YWNode root = this.getRoot();
        if (root instanceof YWShadowRoot) {
            return ((YWShadowRoot) root).getHost().getShadowIncludingRoot();
        }
        return root;
    }

    /**
     * Same as {@link #getInclusiveDescendants()}, except it also follows host of {@link YWShadowRoot} objects.
     *
     * @return Shadow-including root of the node.
     * @see <a href="https://dom.spec.whatwg.org/#concept-shadow-including-inclusive-descendant">Relevant section in DOM specification</a>
     */
    YWNode[] getShadowIncludingInclusiveDescendants() {
        YWNode[] descendants = getInclusiveDescendants();
        List<YWNode> resNodes = new ArrayList<>();
        for (YWNode desc : descendants) {
            if (desc instanceof YWShadowRoot) {
                resNodes.addAll(Arrays.asList(desc.getShadowIncludingInclusiveDescendants()));
            } else {
                resNodes.add(desc);
            }
        }
        return resNodes.toArray(new YWNode[0]);
    }

    /**
     * Same as {@link #getDescendants()}, except it also follows host of {@link YWShadowRoot} objects.
     *
     * @return Shadow-including root of the node.
     * @see <a href="https://dom.spec.whatwg.org/#concept-shadow-including-descendant">Relevant section in DOM specification</a>
     */
    YWNode[] getShadowIncludingDescendants() {
        YWNode[] nodes = getInclusiveDescendants();
        List<YWNode> resNodes = new ArrayList<>(Arrays.asList(nodes).subList(1, nodes.length));
        return resNodes.toArray(new YWNode[0]);
    }

    /**
     * Reports whether node is connected, meaning its shadow-including root is the node document.
     *
     * @return true if node is connected.
     * @see <a href="https://dom.spec.whatwg.org/#connected">Relevant section in DOM specification</a>
     */
    boolean isConnected() {
        return getShadowIncludingRoot() == getNodeDocument();
    }

    /**
     * Reports whether node is in a document tree.
     *
     * @return true if node is in a document tree.
     * @see <a href="https://dom.spec.whatwg.org/#in-a-document-tree">Relevant section in DOM specification</a>
     */
    boolean isInDocumentTree() {
        return getRoot() instanceof YWDocument;
    }

    /**
     * Inserts this node to given parent.
     *
     * @param parent      Parent to insert this node into.
     * @param beforeChild If non-null, the node will be inserted before it. Otherwise, it's inserted after other children.
     * @see <a href="https://dom.spec.whatwg.org/#concept-node-insert">Relevant section in DOM specification</a>
     */
    void insert(YWNode parent, YWNode beforeChild, boolean suppressObservers) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2025.11.13)

        // S1.
        YWNode[] nodes;
        if (this instanceof YWDocumentFragment) {
            nodes = children.toArray(new YWNode[0]);
        } else {
            nodes = new YWNode[]{this};
        }
        // S2.
        int count = nodes.length;
        // S3.
        if (count == 0) {
            return;
        }
        // S4.
        if (this instanceof YWDocumentFragment) {
            throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-insert]");
        }
        // S5.
        if (beforeChild != null) {
            // TODO[https://dom.spec.whatwg.org/#concept-node-insert]
            // 1. For each live range whose start node is parent and start offset is greater than child’s index, increase its start offset by count.
            // 2. For each live range whose end node is parent and end offset is greater than child’s index, increase its end offset by count.
        }
        // S6.
        YWNode prevSibling = parent.getLastChild();
        if (beforeChild != null) {
            prevSibling = beforeChild.getPrevSibling();
        }
        // S7.
        for (YWNode node : nodes) {
            node.parent = parent;

            // S7-1.
            node.adoptNodeInto(parent.getNodeDocument());
            if (beforeChild == null) {
                // S7-2.
                parent.children.add(node);
            } else {
                // S7-3.
                int insertIndex = beforeChild.getIndex();
                parent.children.add(insertIndex, node);
            }
            // S7-4.
            if (parent instanceof YWElement && ((YWElement) parent).isShadowHost()) {
                throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-insert]");
            }
            // S7-5.
            YWNode parentRoot = parent.getRoot();
            if (parentRoot instanceof YWShadowRoot) {
                throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-insert]");
            }
            // S7-6.
            // TODO: Run assign slottables for a tree with node’s root.
            // S7-7.
            for (YWNode inclusiveDescendant : node.getShadowIncludingDescendants()) {
                // S7-7-1.
                inclusiveDescendant.runInsertionSteps();
                if (inclusiveDescendant instanceof YWElement) {
                    YWElement inclusiveDescendantElem = (YWElement) inclusiveDescendant;
                    // S7-7-2.
                    YWCustomElementRegistry reg = inclusiveDescendantElem.getCustomElementRegistry();
                    if (reg == null) {
                        reg = inclusiveDescendant.parent.lookupCustomElementRegistry();
                        inclusiveDescendantElem.setCustomElementRegistry(reg);
                    } else if (reg.isScoped()) {
                        reg.getScopedDocumentSet().add(inclusiveDescendant.getNodeDocument());
                    } else if (inclusiveDescendantElem.isCustom()) {
                        // TODO: enqueue a custom element callback reaction with inclusiveDescendant, callback name "connectedCallback", and « ».
                        throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-insert]");
                    } else {
                       YWHTMLCustomElements.tryUpgradeElement(inclusiveDescendantElem);
                    }
                } else if (inclusiveDescendant instanceof YWShadowRoot) {
                    // S7-7-3.
                    // TODO: If inclusiveDescendant’s custom element registry is null and inclusiveDescendant’s keep custom element registry null is false, then set inclusiveDescendant’s custom element registry to the result of looking up a custom element registry given inclusiveDescendant’s host.
                    // TODO: Otherwise, if inclusiveDescendant’s custom element registry is non-null and inclusiveDescendant’s custom element registry’s is scoped is true, append inclusiveDescendant’s node document to inclusiveDescendant’s custom element registry’s scoped document set.
                    throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-insert]");
                }
            }
        }
        // S8.
        if (!suppressObservers) {
            // TODO: queue a tree mutation record for parent with nodes, « », previousSibling, and child.
        }
        // S9.
        parent.runChildrenChangedSteps();
        // S10.
        List<YWNode> staticNodeList = new ArrayList<>();
        // S11.
        for (YWNode node : nodes) {
            staticNodeList.addAll(Arrays.asList(node.getShadowIncludingDescendants()));
        }
        // S12.
        for (YWNode node : staticNodeList) {
            if (node.isConnected()) {
                node.runPostConnectionSteps();
            }
        }
    }

    /**
     * Inserts a child to this node.
     *
     * @param child Child to insert
     */
    void appendChild(YWNode child) {
        child.insert(this, null, false);
    }

    /**
     * Adopts given node into a document.
     *
     * @param document Document to adopt the node into
     * @see <a href="https://dom.spec.whatwg.org/#concept-node-adopt">Relevant section in DOM specification</a>
     */
    void adoptNodeInto(YWDocument document) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2025.11.13)

        // S1.
        YWDocument oldDocument = this.getNodeDocument();
        // S2.
        if (this.parent != null) {
            // TODO: remove node
            throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-adopt]");
        }
        // S3.
        if (document != oldDocument) {
            // S3-1.
            for (YWNode inclusiveDescendant : getShadowIncludingDescendants()) {
                // S3-1-1.
                inclusiveDescendant.nodeDocument = document;
                if (inclusiveDescendant instanceof YWShadowRoot && YWDOMCustomElements.isGlobalCustomElementRegistry(inclusiveDescendant.lookupCustomElementRegistry())) {
                    // S3-1-2.
                    YWShadowRoot inclusiveDescendantSr = (YWShadowRoot) inclusiveDescendant;
                    // TODO: set inclusiveDescendant’s custom element registry to document’s effective global custom element registry.
                    inclusiveDescendantSr.setCustomElementRegistry(document.getEffectiveGlobalCustomElementRegistry());
                    throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-adopt]");
                } else if (inclusiveDescendant instanceof YWElement) {
                    YWElement inclusiveDescendantElem = (YWElement) inclusiveDescendant;
                    // S3-1-3.
                    // S3-1-3-1.
                    for (int i = 0; i < inclusiveDescendantElem.getAttrs().size(); i++) {
                        inclusiveDescendantElem.getAttrs().get(i).setNodeDocument(document);
                    }
                    // S3-1-3-2.
                    if (YWDOMCustomElements.isGlobalCustomElementRegistry(inclusiveDescendant.lookupCustomElementRegistry())) {
                        // TODO: set inclusiveDescendant’s custom element registry to document’s effective global custom element registry.
                        throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-adopt]");
                    }
                }
            }
            // S3-2.
            for (YWNode inclusiveDescendant : getShadowIncludingDescendants()) {
                if (((YWElement) inclusiveDescendant).isCustom()) {
                    continue;
                }
                // TODO: enqueue a custom element callback reaction with inclusiveDescendant, callback name "adoptedCallback", and « oldDocument, document ».
                throw new RuntimeException("TODO[https://dom.spec.whatwg.org/#concept-node-adopt]");
            }
            // S3-3.
            for (YWNode inclusiveDescendant : getShadowIncludingDescendants()) {
                inclusiveDescendant.runAdoptingSteps(oldDocument);
            }
        }
    }

    YWCustomElementRegistry lookupCustomElementRegistry() {
        if (this instanceof YWElement) {
            return ((YWElement) this).getCustomElementRegistry();
        }
        if (this instanceof YWDocument) {
            return ((YWDocument) this).getCustomElementRegistry();
        }
        if (this instanceof YWShadowRoot) {
            return ((YWShadowRoot) this).getCustomElementRegistry();
        }
        return null;
    }
}
