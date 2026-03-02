package io.github.inseooh.ywsupport;

import java.io.IOException;
import java.io.PrintWriter;
import java.lang.annotation.Annotation;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.Messager;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.annotation.processing.SupportedSourceVersion;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;
import javax.lang.model.type.MirroredTypeException;
import javax.lang.model.type.MirroredTypesException;
import javax.lang.model.type.TypeMirror;
import javax.lang.model.util.Elements;
import javax.lang.model.util.Types;
import javax.tools.Diagnostic;
import javax.tools.JavaFileObject;

@SupportedSourceVersion(SourceVersion.RELEASE_25)
@SupportedAnnotationTypes({
		"io.github.inseooh.ywsupport.YWCSSShorthandProperty",
		"io.github.inseooh.ywsupport.YWCSSSimpleProperty",
		"io.github.inseooh.ywsupport.YWCSSType",
})
public class YWAnnotationProcessor extends AbstractProcessor {
	private Map<String, TypeInfo> typeInfoMap;
	private Map<String, Property> propertyMap;

	@Override
	public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
		typeInfoMap = new HashMap<>();
		propertyMap = new HashMap<>();
		Messager messager = processingEnv.getMessager();
		Elements elementUtils = processingEnv.getElementUtils();

		// Collect type information ====================================================
		for (Element elem : roundEnv.getElementsAnnotatedWith(YWCSSType.class)) {
			TypeElement tElem = (TypeElement) elem;
			YWCSSType anno = elem.getAnnotation(YWCSSType.class);
			MethodInfo parseMethod = findMethodByAnnotation(tElem, YWCSSParserEntry.class, new TypeMirror[] {
					elementUtils.getTypeElement("io.github.inseooh.yw.css.syntax.YWCSSTokenStream").asType()
			});
			if (parseMethod == null) {
				continue;
			}
			String qualifiedName;
			try {
				qualifiedName = anno.resultType().getCanonicalName();
			} catch (MirroredTypeException mte) {
				qualifiedName = mte.getTypeMirror().toString();
			}
			if (qualifiedName.equals("javax.lang.model.type.NullType")) {
				qualifiedName = tElem.getQualifiedName().toString();
			}
			TypeInfo tInfo = new TypeInfo(qualifiedName, parseMethod.qualifiedName);
			typeInfoMap.put(tElem.getQualifiedName().toString(), tInfo);
		}

		// Collect simple properties ===================================================
		for (Element elem : roundEnv.getElementsAnnotatedWith(YWCSSSimpleProperty.class)) {
			TypeElement tElem = (TypeElement) elem;
			YWCSSSimpleProperty anno = elem.getAnnotation(YWCSSSimpleProperty.class);
			final String METHOD_NAME = "getInitialValue";
			MethodInfo initialValueMethod = findMethodByName(tElem, METHOD_NAME, new TypeMirror[0]);
			if (initialValueMethod == null) {
				continue;
			}
			TypeInfo tInfo = getTypeInfoFrom(tElem, anno);
			if (tInfo == null) {
				continue;
			}

			SimpleProperty sProp = new SimpleProperty(anno.name(), anno.inheritable(),
					initialValueMethod.getQualifiedName(), tInfo);
			propertyMap.put(tElem.getQualifiedName().toString(), sProp);
		}

		// Collect shorthand properties ================================================
		for (Element elem : roundEnv.getElementsAnnotatedWith(YWCSSShorthandProperty.class)) {
			TypeElement tElem = (TypeElement) elem;
			YWCSSShorthandProperty anno = elem.getAnnotation(YWCSSShorthandProperty.class);

			String[] qualifiedNames;
			try {
				qualifiedNames = new String[anno.properties().length];
				for (int i = 0; i < anno.properties().length; i++) {
					qualifiedNames[i] = anno.properties()[i].getCanonicalName();
				}
			} catch (MirroredTypesException mte) {
				List<? extends TypeMirror> typeMirrors = mte.getTypeMirrors();
				qualifiedNames = new String[typeMirrors.size()];
				for (int i = 0; i < typeMirrors.size(); i++) {
					qualifiedNames[i] = typeMirrors.get(i).toString();
				}
			}

			Property prop;
			switch (anno.type()) {
				case SIDES:
					if (qualifiedNames.length != 4) {
						messager.printMessage(Diagnostic.Kind.ERROR,
								tElem.getQualifiedName()
										+ ": For type=SIDES, there should be exactly 4 properties, but got "
										+ qualifiedNames.length);
						continue;
					}
					prop = new ShorthandSidesProperty(anno.name(), anno.inheritable(), qualifiedNames[0],
							qualifiedNames[1], qualifiedNames[2], qualifiedNames[3]);
					break;
				case ANY:
					prop = new ShorthandProperty(anno.name(), anno.inheritable(), qualifiedNames);
					break;
				default:
					messager.printMessage(Diagnostic.Kind.ERROR,
							tElem.getQualifiedName()
									+ ": Bad type value " + anno.type());
					continue;
			}
			propertyMap.put(tElem.getQualifiedName().toString(), prop);
		}

		// Generate shorthand class ====================================================
		StringBuilder shorthandImportLinesBuilder = new StringBuilder();
		for (Element elem : roundEnv.getElementsAnnotatedWith(YWCSSShorthandProperty.class)) {
			TypeElement tElem = (TypeElement) elem;
			YWCSSShorthandProperty anno = elem.getAnnotation(YWCSSShorthandProperty.class);
			ShorthandProperty prop = (ShorthandProperty) propertyMap.get(tElem.getQualifiedName().toString());
			if (prop == null) {
				messager.printMessage(Diagnostic.Kind.ERROR,
						tElem.getQualifiedName() + ": could not find " + anno.name());
				continue;
			}
			String className = prop.getTypeInfo().getTypeName();
			String packageName = elementUtils.getPackageOf(elem).toString();
			try {
				JavaFileObject file = processingEnv.getFiler().createSourceFile(packageName + "." + className);
				try (PrintWriter out = new PrintWriter(file.openWriter())) {
					out.println("package " + packageName + ";");
					prop.generateClassCode(out);
				}
			} catch (IOException e) {
				messager.printMessage(Diagnostic.Kind.ERROR,
						tElem.getQualifiedName() + ": Failed to generate source: " + e.getMessage());
				e.printStackTrace();
			}
			shorthandImportLinesBuilder.append("import " + packageName + "." + className + ";\n");
		}
		String shorthandImportLines = shorthandImportLinesBuilder.toString();

		// Generate YWCSSUnfinalizedPropertySet class ==================================
		if (!propertyMap.isEmpty()) {
			String className = "YWCSSUnfinalizedPropertySet";
			String packageName = "io.github.inseooh.yw.css";
			try {
				JavaFileObject file = processingEnv.getFiler().createSourceFile(packageName + "." + className);
				try (PrintWriter out = new PrintWriter(file.openWriter())) {
					out.println("package " + packageName + ";");
					out.println("import java.util.HashMap;");
					out.println("import java.util.Map;");
					out.println(shorthandImportLines);
					out.println("public class " + className + " {");
					// Private fields ==============================================================
					for (Property prop : propertyMap.values()) {
						if (prop.isShorthand()) {
							continue;
						}
						String innerTypeName = prop.getTypeInfo().getTypeName();
						String typeName = "YWCSSUnfinalizedPropertyValue<" + innerTypeName + ">";
						String fieldName = prop.getFieldName();
						out.println("    private " + typeName + " " + fieldName + " = null;");
					}
					// Getter and setter methods ===================================================
					for (Property prop : propertyMap.values()) {
						if (prop.isShorthand()) {
							continue;
						}
						String innerTypeName = prop.getTypeInfo().getTypeName();
						String typeName = "YWCSSUnfinalizedPropertyValue<" + innerTypeName + ">";
						String fieldName = prop.getFieldName();
						String getterName = prop.getGetterMethodName();
						String setterName = prop.getSetterMethodName();
						out.println("    public " + typeName + " " + getterName + "() {");
						out.println("        return " + fieldName + ";");
						out.println("    }");
						out.println("    public void " + setterName + "(" + typeName + " " + fieldName + ") {");
						out.println("        this." + fieldName + " = " + fieldName + ";");
						out.println("    }");
						out.println("    public void " + setterName + "(" + innerTypeName + " " + fieldName + ") {");
						out.println("        this." + fieldName + " = new YWCSSUnfinalizedPropertyValue<>(" + fieldName
								+ ");");
						out.println("    }");
					}
					// The finalizing method =======================================================
					out.println("    private YWCSSPropertySet finalizeProperties(YWCSSPropertySet parentSet) {");
					for (Property prop : propertyMap.values()) {
						prop.generateFinalizeCode(out, 2, "parentSet");
					}
					out.println("        return new YWCSSPropertySet(this);");
					out.println("    }");

					out.println("}");

				}
			} catch (IOException e) {
				messager.printMessage(Diagnostic.Kind.ERROR, "Failed to generate source: " + e.getMessage());
				e.printStackTrace();
			}
		}

		// Generate YWCSSPropertySet class =============================================
		if (!propertyMap.isEmpty()) {
			String className = "YWCSSPropertySet";
			String packageName = "io.github.inseooh.yw.css";
			try {
				JavaFileObject file = processingEnv.getFiler().createSourceFile(packageName + "." + className);
				try (PrintWriter out = new PrintWriter(file.openWriter())) {
					out.println("package " + packageName + ";");
					out.println("import java.util.HashMap;");
					out.println("import java.util.Map;");
					out.println("import io.github.inseooh.yw.YWSyntaxError;");
					out.println("import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;");
					out.println(shorthandImportLines);
					out.println("public class " + className + " {");
					// Property descriptors ========================================================
					out.println(
							"    public static final Map<String, YWCSSPropertyDescriptor> DESCRIPTORS = new HashMap<>();");
					out.println("    static {");
					for (Property prop : propertyMap.values()) {
						String name = prop.getName();
						out.println("        DESCRIPTORS.put(\"" + name + "\", ");
						out.println("            new YWCSSPropertyDescriptor() {");
						out.println("                @Override");
						out.println("                public Object parse(YWCSSTokenStream ts) throws YWSyntaxError {");
						out.println("                	" + prop.getTypeInfo().getTypeName() + " res;");
						prop.generateParserCode(out, 5, "res", "ts");
						out.println("                	return res;");
						out.println("                }");
						out.println("                @Override");
						out.println("                public Object getInitialValue() {");
						out.println("                	" + prop.getTypeInfo().getTypeName() + " res;");
						prop.generateInitialValueCode(out, 5, "res");
						out.println("                    return res;");
						out.println("                }");
						out.println("                @Override");
						out.println(
								"    			public void apply(YWCSSUnfinalizedPropertySet propertySet, Object value) {");
						prop.generateApplyCode(out, 5, "propertySet", "value");
						out.println("                }");
						out.println("            }");
						out.println("        );");
					}
					out.println("    }");
					// Private fields ==============================================================
					for (Property prop : propertyMap.values()) {
						if (prop.isShorthand()) {
							continue;
						}
						String typeName = prop.getTypeInfo().getTypeName();
						String fieldName = prop.getFieldName();
						out.println("    private final " + typeName + " " + fieldName + ";");
					}
					// Constructor ==============================================================
					// The constructor is not public, as it's only meant to be called at the end of
					// finalization.
					out.println("    " + className + "(YWCSSUnfinalizedPropertySet set) {");
					for (Property prop : propertyMap.values()) {
						if (prop.isShorthand()) {
							continue;
						}
						String fieldName = prop.getFieldName();
						String getterName = prop.getGetterMethodName();
						String value = "set." + getterName + "().getValue()";
						out.println("        this." + fieldName + " = " + value + ";");
					}
					out.println("    }");
					// Getter methods ==============================================================
					for (Property prop : propertyMap.values()) {
						if (prop.isShorthand()) {
							continue;
						}
						String typeName = prop.getTypeInfo().getTypeName();
						String fieldName = prop.getFieldName();
						String getterName = prop.getGetterMethodName();
						out.println("    public " + typeName + " " + getterName + "() {");
						out.println("        return " + fieldName + ";");
						out.println("    }");
					}

					out.println("}");

				}
			} catch (IOException e) {
				messager.printMessage(Diagnostic.Kind.ERROR, "Failed to generate source: " + e.getMessage());
				e.printStackTrace();
			}
		}

		return true;
	}

	private TypeInfo getTypeInfoFrom(TypeElement elem, YWCSSSimpleProperty anno) {
		Messager messager = processingEnv.getMessager();
		String qualifiedName;
		try {
			qualifiedName = anno.type().getCanonicalName();
		} catch (MirroredTypeException mte) {
			qualifiedName = mte.getTypeMirror().toString();
		}
		if (!typeInfoMap.containsKey(qualifiedName)) {
			messager.printMessage(Diagnostic.Kind.ERROR,
					elem.getQualifiedName() + " points to unknown type " + qualifiedName
							+ ". Did you forgot to add @" + YWCSSType.class.getSimpleName() + " annotation to it?");
			return null;
		}
		return typeInfoMap.get(qualifiedName);
	}

	private class MethodInfo {
		private final String qualifiedName;

		public MethodInfo(String qualifiedName) {
			this.qualifiedName = qualifiedName;
		}

		public String getQualifiedName() {
			return qualifiedName;
		}
	};

	/**
	 * NOTE: This expects a public static method.
	 */
	private MethodInfo findMethodByName(TypeElement elem, String methodName, TypeMirror[] parameterTypes) {
		Messager messager = processingEnv.getMessager();
		for (Element enclosedElem : elem.getEnclosedElements()) {
			if (enclosedElem.getKind() != ElementKind.METHOD) {
				continue;
			}
			ExecutableElement methodElem = (ExecutableElement) enclosedElem;
			String gotMethodName = methodElem.getSimpleName().toString();
			if (!gotMethodName.equals(methodName)) {
				continue;
			}
			return checkMethod(elem, methodElem, parameterTypes);
		}
		messager.printMessage(Diagnostic.Kind.ERROR,
				"Could not find " + methodName + " method from " + elem.getQualifiedName());
		return null;
	}

	/**
	 * NOTE: This expects a public static method.
	 */
	private MethodInfo findMethodByAnnotation(TypeElement elem, Class<? extends Annotation> anno,
			TypeMirror[] parameterTypes) {
		Messager messager = processingEnv.getMessager();
		ExecutableElement gotMethodElem = null;
		for (Element enclosedElem : elem.getEnclosedElements()) {
			if (enclosedElem.getKind() != ElementKind.METHOD) {
				continue;
			}
			ExecutableElement methodElem = (ExecutableElement) enclosedElem;
			if (methodElem.getAnnotation(anno) == null) {
				continue;
			}
			if (gotMethodElem != null) {
				messager.printMessage(Diagnostic.Kind.ERROR,
						elem.getQualifiedName() + " contains more than one methods with @" + anno.getSimpleName());
			}
			gotMethodElem = methodElem;
		}
		if (gotMethodElem == null) {
			messager.printMessage(Diagnostic.Kind.ERROR,
					elem.getQualifiedName() + " does not have method with @" + anno.getSimpleName());
			return null;
		}
		return checkMethod(elem, gotMethodElem, parameterTypes);
	}

	/**
	 * NOTE: This expects a public static method.
	 */
	private MethodInfo checkMethod(TypeElement enclosingElem, ExecutableElement methodElem,
			TypeMirror[] parameterTypes) {
		Messager messager = processingEnv.getMessager();
		Types typeUtils = processingEnv.getTypeUtils();
		String methodName = methodElem.getSimpleName().toString();

		// Check modifiers ---------------------------------------------
		boolean hasPublic = false, hasStatic = false;
		for (Modifier modifier : methodElem.getModifiers()) {
			if (modifier == Modifier.PUBLIC) {
				hasPublic = true;
			}
			if (modifier == Modifier.STATIC) {
				hasStatic = true;
			}
		}
		if (!hasPublic) {
			messager.printMessage(Diagnostic.Kind.ERROR,
					enclosingElem.getQualifiedName() + ": " + methodName + " must have public modifier");
			return null;
		}
		if (!hasStatic) {
			messager.printMessage(Diagnostic.Kind.ERROR,
					enclosingElem.getQualifiedName() + ": " + methodName + " must have static modifier");
			return null;
		}
		// Check parameters --------------------------------------------
		if (methodElem.getParameters().size() != parameterTypes.length) {
			messager.printMessage(Diagnostic.Kind.ERROR,
					enclosingElem.getQualifiedName() + ": " + methodName + " should have " + parameterTypes.length
							+ " paramters, got " + methodElem.getParameters().size());
			return null;
		}
		for (int i = 0; i < methodElem.getParameters().size(); i++) {
			VariableElement param = methodElem.getParameters().get(i);
			if (!typeUtils.isSameType(param.asType(), parameterTypes[i])) {
				messager.printMessage(Diagnostic.Kind.ERROR,
						enclosingElem.getQualifiedName() + ": Parameter " + i + " of " + methodName + " should have "
								+ parameterTypes[i] + ", got " + param.asType());
			}
		}
		// Get return type ---------------------------------------------
		return new MethodInfo(enclosingElem.getQualifiedName() + "." + methodName);
	}

	private static class TypeInfo {
		private final String typeName;
		private final String parseMethodName;

		public TypeInfo(String typeName, String parseMethodName) {
			this.typeName = typeName;
			this.parseMethodName = parseMethodName;
		}

		public String getTypeName() {
			return typeName;
		}

		public String getParseMethodName() {
			return parseMethodName;
		}
	}

	private static abstract class Property {
		private final String name;
		private final boolean inheritable;

		public Property(String name, boolean inheritable) {
			this.name = name;
			this.inheritable = inheritable;
		}

		public String getName() {
			return name;
		}

		public boolean isInheritable() {
			return inheritable;
		}

		public abstract TypeInfo getTypeInfo();

		public abstract boolean isShorthand();

		public abstract void generateInitialValueCode(PrintWriter out, int indent, String outVar);

		public abstract void generateApplyCode(PrintWriter out, int indent, String outVar, String inVar);

		public abstract void generateFinalizeCode(PrintWriter out, int indent, String parentVar);

		public abstract void generateParserCode(PrintWriter out, int indent, String outVar, String tsVar);

		public String getJavaIdentName(boolean leadingCharUpper) {
			if (isShorthand()) {
				// We explicitly name shorthand properties ~Shorthand to avoid confusion.
				return camelCaseName(name, leadingCharUpper) + "Shorthand";
			} else {
				return camelCaseName(name, leadingCharUpper);
			}
		}

		public String getFieldName() {
			return getJavaIdentName(false) + "Value";
		}

		public String getGetterMethodName() {
			return "get" + getJavaIdentName(true);
		}

		public String getSetterMethodName() {
			return "set" + getJavaIdentName(true);
		}
	}

	private static class SimpleProperty extends Property {
		private final TypeInfo typeInfo;
		private final String initialValueMethod;

		public SimpleProperty(String name, boolean inheritable, String initialValueMethod, TypeInfo typeInfo) {
			super(name, inheritable);
			this.typeInfo = typeInfo;
			this.initialValueMethod = initialValueMethod;
		}

		@Override
		public boolean isShorthand() {
			return false;
		}

		@Override
		public TypeInfo getTypeInfo() {
			return typeInfo;
		}

		@Override
		public void generateInitialValueCode(PrintWriter out, int indent, String outVar) {
			String prefix = "    ".repeat(indent);
			out.println(prefix + outVar + " = " + initialValueMethod + "();");
		}

		@Override
		public void generateApplyCode(PrintWriter out, int indent, String outVar, String inVar) {
			String prefix = "    ".repeat(indent);
			String typeName = getTypeInfo().getTypeName();
			String setterName = getSetterMethodName();
			out.println(prefix + outVar + "." + setterName + "((" + typeName + ") " + inVar + ");");
		}

		@Override
		public void generateFinalizeCode(PrintWriter out, int indent, String parentVar) {
			String varPrefix = String.format("v%x", this.hashCode());
			String prefix = "    ".repeat(indent);
			String getterName = getGetterMethodName();
			String setterName = getSetterMethodName();
			String myValue = getterName + "()";
			String parentValue = parentVar + "." + getterName + "()";
			out.println(prefix + "switch (" + myValue + ".getKind()) {");
			out.println(prefix + "    case INHERIT:");
			if (isInheritable()) {
				out.println(prefix + "    case NOT_SPECIFIED:");
				out.println(prefix + "    case UNSET:");
			}
			out.println(prefix + "        " + setterName + "(" + parentValue + ");");
			out.println(prefix + "        break;");
			out.println(prefix + "    case INITIAL:");
			if (!isInheritable()) {
				out.println(prefix + "    case UNSET:");
			}
			out.println(prefix + "        {");
			String propType = getTypeInfo().getTypeName();
			String tempVar = varPrefix + "_temp";
			out.println(prefix + "            " + propType + " " + tempVar + ";");
			generateInitialValueCode(out, indent + 1, tempVar);
			out.println(prefix + "            " + setterName + "(" + tempVar + ");");
			out.println(prefix + "        }");
			out.println(prefix + "        break;");
			out.println(prefix + "}");
		}

		@Override
		public void generateParserCode(PrintWriter out, int indent, String outVar, String tsVar) {
			String prefix = "    ".repeat(indent);
			out.println(prefix + outVar + " = " + getTypeInfo().getParseMethodName() + "(" + tsVar + ");");
		}
	}

	private class ShorthandProperty extends Property {
		private final String[] propertyKeys;

		public ShorthandProperty(String name, boolean inheritable, String[] propertyKeys) {
			super(name, inheritable);
			this.propertyKeys = propertyKeys;
		}

		private String getTypeName() {
			return String.format("YWCSS%sShorthand", camelCaseName(getName(), true));
		}

		private String getParseMethodName() {
			return String.format("parse%s", camelCaseName(getTypeName(), true));
		}

		@Override
		public TypeInfo getTypeInfo() {
			return new TypeInfo(getTypeName(), getParseMethodName());
		}

		@Override
		public void generateInitialValueCode(PrintWriter out, int indent, String outVar) {
			String varPrefix = String.format("v%x", this.hashCode());
			String prefix = "    ".repeat(indent);
			out.println(prefix + outVar + " = new " + getTypeInfo().getTypeName() + "();");
			for (String propertyKey : propertyKeys) {
				Property prop = propertyMap.get(propertyKey);
				String setterName = prop.getSetterMethodName();
				String propVar = varPrefix + "_" + prop.getFieldName();
				String propType = prop.getTypeInfo().getTypeName();
				out.println(prefix + "{");
				out.println(prefix + "    " + propType + " " + propVar + ";");
				prop.generateInitialValueCode(out, indent + 1, propVar);
				out.println(prefix + "    " + outVar + "." + setterName + "(" + propVar + ");");
				out.println(prefix + "}");
			}
		}

		@Override
		public boolean isShorthand() {
			return true;
		}

		public Property[] getProperties() {
			Property[] res = new Property[propertyKeys.length];
			for (int i = 0; i < res.length; i++) {
				res[i] = propertyMap.get(propertyKeys[i]);
			}
			return res;
		}

		public void generateClassCode(PrintWriter out) {
			Property[] properties = getProperties();

			String className = getTypeInfo().getTypeName();
			out.println("public class " + className + " {");
			for (Property prop : properties) {
				String typeName = prop.getTypeInfo().getTypeName();
				String fieldName = prop.getFieldName();
				out.println("    private " + typeName + " " + fieldName + ";");
			}
			for (Property prop : getProperties()) {
				String typeName = prop.getTypeInfo().getTypeName();
				String getterName = prop.getGetterMethodName();
				String setterName = prop.getSetterMethodName();
				String fieldName = prop.getFieldName();
				out.println("    public " + typeName + " " + getterName + "() {");
				out.println("        return " + fieldName + ";");
				out.println("    }");
				out.println("    public void " + setterName + "(" + typeName + " " + fieldName + ") {");
				out.println("        this." + fieldName + " = " + fieldName + ";");
				out.println("    }");
			}
			out.println("}");
		}

		@Override
		public void generateApplyCode(PrintWriter out, int indent, String outVar, String inVar) {
			Property[] properties = getProperties();
			for (Property prop : properties) {
				prop.generateApplyCode(out, indent, outVar, inVar);
			}
		}

		@Override
		public void generateFinalizeCode(PrintWriter out, int indent, String parentVar) {
			Property[] properties = getProperties();
			for (Property prop : properties) {
				prop.generateFinalizeCode(out, indent, parentVar);
			}
		}

		@Override
		public void generateParserCode(PrintWriter out, int indent, String outVar, String tsVar) {
			Property[] properties = getProperties();
			String prefix = "    ".repeat(indent);
			String varPrefix = String.format("v%x", this.hashCode());
			String oldCursorVar = varPrefix + "_oldCursor";
			String tempVar = varPrefix + "_temp";
			String gotAnyVar = varPrefix + "_gotAny";
			String isValidVar = varPrefix + "_isValid";
			for (Property prop : properties) {
				String propVar = varPrefix + "_prop" + prop.getJavaIdentName(true);
				String propType = prop.getTypeInfo().getTypeName();
				out.println(prefix + propType + " " + propVar + " = null;");
			}
			generateInitialValueCode(out, indent, outVar);
			out.println(prefix + "boolean " + gotAnyVar + " = false;");
			out.println(prefix + "while (true) {");
			out.println(prefix + "    boolean " + isValidVar + " = false;");
			out.println(prefix + "    int " + oldCursorVar + " = " + tsVar + ".getCursor();");
			for (Property prop : properties) {
				String propField = varPrefix + "_prop" + prop.getJavaIdentName(true);
				String propType = prop.getTypeInfo().getTypeName();
				out.println(prefix + "    " + tsVar + ".skipWhitespaces();");
				out.println(prefix + "    if (" + propField + " == null) {");
				out.println(prefix + "        try {");
				if (prop instanceof ShorthandSidesProperty) {
					Property firstProp = ((ShorthandSidesProperty) prop).getProperties()[0];
					// For "sides" shorthands, we accept one value and spread it across all four
					// sides.
					out.println(prefix + "            " + firstProp.getTypeInfo().getTypeName() + " " + tempVar + ";");
					firstProp.generateParserCode(out, indent + 3, tempVar, tsVar);
					String typeName = prop.getTypeInfo().getTypeName();
					out.println(prefix + "            " + propField + " = new " + typeName + "();");
					out.println(prefix + "            " + propField + ".setLeft(" + tempVar + ");");
					out.println(prefix + "            " + propField + ".setTop(" + tempVar + ");");
					out.println(prefix + "            " + propField + ".setRight(" + tempVar + ");");
					out.println(prefix + "            " + propField + ".setBottom(" + tempVar + ");");
				} else {
					out.println(prefix + "            " + propType + " " + tempVar + ";");
					prop.generateParserCode(out, indent + 3, tempVar, tsVar);
					out.println(prefix + "            " + propField + " = " + tempVar + ";");
				}
				out.println(prefix + "            " + isValidVar + " = true;");
				out.println(prefix + "        } catch(YWSyntaxError e) {");
				out.println(prefix + "            " + tsVar + ".setCursor(" + oldCursorVar + ");");
				out.println(prefix + "        }");
				out.println(prefix + "    }");
			}
			out.println(prefix + "    " + tsVar + ".skipWhitespaces();");
			out.println(prefix + "    if (!" + isValidVar + ") {");
			out.println(prefix + "        break;");
			out.println(prefix + "    }");
			out.println(prefix + "    " + gotAnyVar + " = true;");
			out.println(prefix + "}");
			out.println(prefix + "if (!" + gotAnyVar + ") {");
			out.println(prefix + "    throw new YWSyntaxError();");
			out.println(prefix + "}");
		}
	}

	private class ShorthandSidesProperty extends ShorthandProperty {
		public ShorthandSidesProperty(String name, boolean inheritable, String top, String right, String bottom,
				String left) {
			super(name, inheritable, new String[] { top, right, bottom, left });
		}

		@Override
		public void generateClassCode(PrintWriter out) {
			String className = getTypeInfo().getTypeName();
			out.println("public class " + className + " {");
			Property topProp = getProperties()[0];
			Property rightProp = getProperties()[1];
			Property bottomProp = getProperties()[2];
			Property leftProp = getProperties()[3];
			out.println("    private " + topProp.getTypeInfo().getTypeName() + " top;");
			out.println("    private " + rightProp.getTypeInfo().getTypeName() + " right;");
			out.println("    private " + bottomProp.getTypeInfo().getTypeName() + " bottom;");
			out.println("    private " + leftProp.getTypeInfo().getTypeName() + " left;");
			out.println("    public " + topProp.getTypeInfo().getTypeName() + " getTop() {");
			out.println("        return top;");
			out.println("    }");
			out.println("    public void setTop(" + topProp.getTypeInfo().getTypeName() + " top) {");
			out.println("        this.top = top;");
			out.println("    }");
			out.println("    public " + rightProp.getTypeInfo().getTypeName() + " getRight() {");
			out.println("        return this.right;");
			out.println("    }");
			out.println("    public void setRight(" + rightProp.getTypeInfo().getTypeName() + " right) {");
			out.println("        this.right = right;");
			out.println("    }");
			out.println("    public " + bottomProp.getTypeInfo().getTypeName() + " getBottom() {");
			out.println("        return this.bottom;");
			out.println("    }");
			out.println("    public void setBottom(" + bottomProp.getTypeInfo().getTypeName() + " bottom) {");
			out.println("        this.bottom = bottom;");
			out.println("    }");
			out.println("    public " + leftProp.getTypeInfo().getTypeName() + " getLeft() {");
			out.println("        return this.left;");
			out.println("    }");
			out.println("    public void setLeft(" + leftProp.getTypeInfo().getTypeName() + " left) {");
			out.println("        this.left = left;");
			out.println("    }");
			out.println("}");
		}

		@Override
		public void generateInitialValueCode(PrintWriter out, int indent, String outVar) {
			String varPrefix = String.format("v%x", this.hashCode());
			String prefix = "    ".repeat(indent);
			out.println(prefix + "{");
			out.println(prefix + "    " + outVar + " = new " + getTypeInfo().getTypeName() + "();");
			Property topProp = getProperties()[0];
			Property rightProp = getProperties()[1];
			Property bottomProp = getProperties()[2];
			Property leftProp = getProperties()[3];
			String tempVar = varPrefix + "_temp";

			out.println(prefix + "    {");
			out.println(prefix + "        " + topProp.getTypeInfo().getTypeName() + " " + tempVar + ";");
			topProp.generateInitialValueCode(out, indent + 2, tempVar);
			out.println(prefix + "        " + outVar + ".setTop(" + tempVar + ");");
			out.println(prefix + "    }");

			out.println(prefix + "    {");
			out.println(prefix + "        " + rightProp.getTypeInfo().getTypeName() + " " + tempVar + ";");
			rightProp.generateInitialValueCode(out, indent + 2, tempVar);
			out.println(prefix + "        " + outVar + ".setRight(" + tempVar + ");");
			out.println(prefix + "    }");

			out.println(prefix + "    {");
			out.println(prefix + "        " + bottomProp.getTypeInfo().getTypeName() + " " + tempVar + ";");
			bottomProp.generateInitialValueCode(out, indent + 2, tempVar);
			out.println(prefix + "        " + outVar + ".setBottom(" + tempVar + ");");
			out.println(prefix + "    }");

			out.println(prefix + "    {");
			out.println(prefix + "        " + leftProp.getTypeInfo().getTypeName() + " " + tempVar + ";");
			leftProp.generateInitialValueCode(out, indent + 2, tempVar);
			out.println(prefix + "        " + outVar + ".setLeft(" + tempVar + ");");
			out.println(prefix + "    }");

			out.println(prefix + "}");
		}

		@Override
		public void generateParserCode(PrintWriter out, int indent, String outVar, String tsVar) {
			String prefix = "    ".repeat(indent);
			String varPrefix = String.format("v%x", this.hashCode());
			String itemsVar = varPrefix + "_items";
			String innerResVar = varPrefix + "_res";
			String type = getProperties()[0].getTypeInfo().getTypeName();
			generateInitialValueCode(out, indent, outVar);

			out.println(
					prefix + type + "[] " + itemsVar + " = " + tsVar + ".parseRepeation(new " + type + "[0], () -> {");
			out.println(prefix + "    " + type + " " + innerResVar + ";");
			getProperties()[0].generateParserCode(out, indent + 1, innerResVar, tsVar);
			out.println(prefix + "    return " + innerResVar + ";");
			out.println(prefix + "});");
			out.println(prefix + "switch (" + itemsVar + ".length) {");
			out.println(prefix + "    case 1:");
			out.println(prefix + "        " + outVar + ".setTop(" + itemsVar + "[0]);");
			out.println(prefix + "        " + outVar + ".setRight(" + itemsVar + "[0]);");
			out.println(prefix + "        " + outVar + ".setBottom(" + itemsVar + "[0]);");
			out.println(prefix + "        " + outVar + ".setLeft(" + itemsVar + "[0]);");
			out.println(prefix + "        break;");
			out.println(prefix + "    case 2:");
			out.println(prefix + "        " + outVar + ".setTop(" + itemsVar + "[0]);");
			out.println(prefix + "        " + outVar + ".setRight(" + itemsVar + "[1]);");
			out.println(prefix + "        " + outVar + ".setBottom(" + itemsVar + "[0]);");
			out.println(prefix + "        " + outVar + ".setLeft(" + itemsVar + "[1]);");
			out.println(prefix + "        break;");
			out.println(prefix + "    case 3:");
			out.println(prefix + "        " + outVar + ".setTop(" + itemsVar + "[0]);");
			out.println(prefix + "        " + outVar + ".setRight(" + itemsVar + "[1]);");
			out.println(prefix + "        " + outVar + ".setBottom(" + itemsVar + "[2]);");
			out.println(prefix + "        " + outVar + ".setLeft(" + itemsVar + "[1]);");
			out.println(prefix + "        break;");
			out.println(prefix + "    case 4:");
			out.println(prefix + "        " + outVar + ".setTop(" + itemsVar + "[0]);");
			out.println(prefix + "        " + outVar + ".setRight(" + itemsVar + "[1]);");
			out.println(prefix + "        " + outVar + ".setBottom(" + itemsVar + "[2]);");
			out.println(prefix + "        " + outVar + ".setLeft(" + itemsVar + "[3]);");
			out.println(prefix + "        break;");
			out.println(prefix + "    default:");
			out.println(prefix + "        throw new YWSyntaxError();");
			out.println(prefix + "}");
		}
	}

	private static String camelCaseName(String name, boolean leadingCharUpper) {
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
