package io.github.inseooh.ywapt;

import java.lang.annotation.ElementType;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
public @interface YWCSSShorthandProperty {
    public static enum Type {
        SIDES, ANY
    }

    public String name();

    public Type type();

    public Class<?>[] properties();

    public boolean inheritable() default false;
}
