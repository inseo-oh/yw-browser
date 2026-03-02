package io.github.inseooh.yw.css;

public class YWCSSUnfinalizedPropertyValue<T> {
    public static final YWCSSUnfinalizedPropertyValue<?> NOT_SPECIFIED = new YWCSSUnfinalizedPropertyValue<>(
            Kind.NOT_SPECIFIED);
    public static final YWCSSUnfinalizedPropertyValue<?> INITIAL = new YWCSSUnfinalizedPropertyValue<>(Kind.INITIAL);
    public static final YWCSSUnfinalizedPropertyValue<?> INHERIT = new YWCSSUnfinalizedPropertyValue<>(Kind.INHERIT);
    public static final YWCSSUnfinalizedPropertyValue<?> UNSET = new YWCSSUnfinalizedPropertyValue<>(Kind.UNSET);

    public enum Kind {
        NOT_SPECIFIED,
        INITIAL,
        INHERIT,
        UNSET,
        VALUE,
    }

    private final Kind kind;
    private final T value;

    public YWCSSUnfinalizedPropertyValue(T value) {
        this.kind = Kind.VALUE;
        this.value = value;
    }

    private YWCSSUnfinalizedPropertyValue(Kind kind) {
        if (kind == Kind.VALUE) {
            throw new RuntimeException("Bad kind value");
        }
        this.kind = kind;
        this.value = null;
    }

    public Kind getKind() {
        return kind;
    }

    public T getValue() {
        if (kind != Kind.VALUE) {
            throw new RuntimeException("There's no associated value");
        }
        return value;
    }

}
