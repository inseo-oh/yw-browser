package io.github.inseooh.yw.css.syntax;

import io.github.inseooh.yw.YWSyntaxError;

@FunctionalInterface
public interface YWCSSParse<T> {
	T parse() throws YWSyntaxError;
}
