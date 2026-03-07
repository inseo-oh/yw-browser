package io.github.inseooh.yw.html.parsing;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import io.github.inseooh.yw.json.YWJSONParser;
import io.github.inseooh.yw.json.YWJSONValue;

final class YWHTMLEntities {
    private static final Logger logger = Logger.getLogger(YWHTMLEntities.class.getSimpleName());
    private static final String JSON_PATH = "entities.json";

    public static record Entry(String name, int[] codePoints, String chars) {
    }

    public static Entry[] ENTRIES = new Entry[0];

    static {
        try {
            Path path = Paths.get(YWHTMLEntities.class.getClassLoader().getResource(JSON_PATH).toURI());
            String src = Files.readString(path);
            YWJSONValue rootValue = YWJSONParser.parse(src);
            Map<String, YWJSONValue> rootObj = YWJSONValue.expectObject(rootValue);
            List<Entry> entryList = new ArrayList<>();
            for (Map.Entry<String, YWJSONValue> entry : rootObj.entrySet()) {
                String entryName = entry.getKey();
                Map<String, YWJSONValue> entryValue = YWJSONValue.expectObject(entry.getValue());
                int[] codePoints = YWJSONValue.expectIntArray(entryValue.get("codepoints"));
                String chars = YWJSONValue.expectString(entryValue.get("characters"));
                entryList.add(new Entry(entryName, codePoints, chars));
            }
            ENTRIES = entryList.toArray(new Entry[0]);
        } catch (Exception e) {
            logger.severe("Could not load " + JSON_PATH + ": " + e.getMessage());
            logger.severe("HTML named entities (e.g. &nbsp) will NOT work.");
            e.printStackTrace();
        }

    }
}
