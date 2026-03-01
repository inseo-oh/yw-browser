package io.github.inseooh.ywsupport;

import java.lang.annotation.ElementType;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
public @interface YWCSSShorthandAnyProperty {
    String[] properties();
}
