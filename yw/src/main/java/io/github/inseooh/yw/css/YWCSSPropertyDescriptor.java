package io.github.inseooh.yw.css;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public interface YWCSSPropertyDescriptor {
    public Object parse(YWCSSTokenStream ts) throws YWSyntaxError;

    Object getInitialValue();

    void apply(YWCSSUnfinalizedPropertySet propertySet, Object value);

}
