package io.github.inseooh.ywapt;

class YWAPTUtility {
    static String camelCaseName(String name, boolean leadingCharUpper) {
        StringBuilder sb = new StringBuilder();
        boolean nextUpper = leadingCharUpper;
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (c == '_' || c == '-') {
                nextUpper = true;
            } else if (nextUpper) {
                sb.append(Character.toUpperCase(c));
                nextUpper = false;
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
