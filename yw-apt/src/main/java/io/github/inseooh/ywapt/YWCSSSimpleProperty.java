package io.github.inseooh.ywapt;

import java.lang.annotation.ElementType;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
public @interface YWCSSSimpleProperty {
    public String name();

    public Class<?> type();

    public boolean inheritable() default false;
}
