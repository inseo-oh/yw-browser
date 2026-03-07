package io.github.inseooh.yw.json;

import java.util.List;
import java.util.Map;

public sealed interface YWJSONValue {
    public record Obj(Map<String, YWJSONValue> values) implements YWJSONValue {
    }

    public record Arr(List<YWJSONValue> values) implements YWJSONValue {
    }

    /**
     * @apiNote JSON doesn't officially have "integer" and "float" distinction, but
     *          for our use-cases, we need one.
     */
    public record Num(float value, boolean isFloat) implements YWJSONValue {
    }

    public record Str(String value) implements YWJSONValue {
    }

    public record Bool(boolean value) implements YWJSONValue {
    }

    public record Null() implements YWJSONValue {
    }

    public static Map<String, YWJSONValue> expectObject(YWJSONValue v) {
        if (v instanceof Obj res) {
            return res.values();
        } else {
            throw new RuntimeException("Expected an object, got " + v);
        }
    }

    public static YWJSONValue[] expectArray(YWJSONValue v) {
        if (v instanceof Arr res) {
            return res.values().toArray(new YWJSONValue[0]);
        } else {
            throw new RuntimeException("Expected an array, got " + v);
        }
    }

    public static Map<String, YWJSONValue>[] expectObjectArray(YWJSONValue v) {
        YWJSONValue[] arr = expectArray(v);

        @SuppressWarnings("unchecked")
        Map<String, YWJSONValue>[] res = new Map[arr.length];
        for (int i = 0; i < arr.length; i++) {
            res[i] = expectObject(arr[i]);
        }
        return res;
    }

    public static YWJSONValue[][] expectArrayArray(YWJSONValue v) {
        YWJSONValue[] arr = expectArray(v);

        YWJSONValue[][] res = new YWJSONValue[0][arr.length];
        for (int i = 0; i < arr.length; i++) {
            res[i] = expectArray(arr[i]);
        }
        return res;
    }

    public static String[] expectStringArray(YWJSONValue v) {
        YWJSONValue[] arr = expectArray(v);

        String[] res = new String[arr.length];
        for (int i = 0; i < arr.length; i++) {
            res[i] = expectString(arr[i]);
        }
        return res;
    }

    public static float[] expectNumberArray(YWJSONValue v) {
        YWJSONValue[] arr = expectArray(v);

        float[] res = new float[arr.length];
        for (int i = 0; i < arr.length; i++) {
            res[i] = expectNumber(arr[i]);
        }
        return res;
    }

    public static int[] expectIntArray(YWJSONValue v) {
        YWJSONValue[] arr = expectArray(v);

        int[] res = new int[arr.length];
        for (int i = 0; i < arr.length; i++) {
            res[i] = expectInt(arr[i]);
        }
        return res;
    }

    public static boolean[] expectBooleanArray(YWJSONValue v) {
        YWJSONValue[] arr = expectArray(v);

        boolean[] res = new boolean[arr.length];
        for (int i = 0; i < arr.length; i++) {
            res[i] = expectBoolean(arr[i]);
        }
        return res;
    }

    public static void expectNullArray(YWJSONValue v) {
        YWJSONValue[] arr = expectArray(v);

        for (int i = 0; i < arr.length; i++) {
            expectNull(arr[i]);
        }
    }

    public static float expectNumber(YWJSONValue v) {
        if (v instanceof Num res) {
            return res.value();
        } else {
            throw new RuntimeException("Expected a number, got " + v);
        }
    }

    public static int expectInt(YWJSONValue v) {
        if (v instanceof Num res && !res.isFloat()) {
            return (int) res.value();
        } else {
            throw new RuntimeException("Expected a integer number, got " + v);
        }
    }

    public static String expectString(YWJSONValue v) {
        if (v instanceof Str res) {
            return res.value();
        } else {
            throw new RuntimeException("Expected a string, got " + v);
        }
    }

    public static boolean expectBoolean(YWJSONValue v) {
        if (v instanceof Bool res) {
            return res.value();
        } else {
            throw new RuntimeException("Expected a boolean, got " + v);
        }
    }

    public static void expectNull(YWJSONValue v) {
        if (v instanceof Null) {
            return;
        } else {
            throw new RuntimeException("Expected a null, got " + v);
        }
    }

    public static Obj create(Map<String, YWJSONValue> values) {
        return new Obj(values);
    }

    public static Arr create(List<YWJSONValue> values) {
        return new Arr(values);
    }

    public static Num create(float value) {
        return new Num(value, true);
    }

    public static Num create(int value) {
        return new Num(value, false);
    }

    public static Str create(String value) {
        return new Str(value);
    }

    public static Bool create(boolean value) {
        return new Bool(value);
    }

}
