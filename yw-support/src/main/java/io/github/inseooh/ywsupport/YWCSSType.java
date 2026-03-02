package io.github.inseooh.ywsupport;

import java.lang.annotation.ElementType;
import java.lang.annotation.Target;

import javax.lang.model.type.NullType;

@Target(ElementType.TYPE)
public @interface YWCSSType {
    Class<?> resultType() default NullType.class;
}
