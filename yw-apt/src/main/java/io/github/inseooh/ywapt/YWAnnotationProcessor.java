package io.github.inseooh.ywapt;

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

@SupportedSourceVersion(SourceVersion.RELEASE_8)
@SupportedAnnotationTypes({
		"io.github.inseooh.ywapt.YWCSSShorthandAnyProperty",
		"io.github.inseooh.ywapt.YWCSSShorthandSidesProperty",
		"io.github.inseooh.ywapt.YWCSSSimpleProperty",
		"io.github.inseooh.ywapt.YWCSSType",
})
public class YWAnnotationProcessor extends AbstractProcessor {
	@Override
	public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
		Messager messager = processingEnv.getMessager();
		Elements elements = processingEnv.getElementUtils();
		Map<String, TypeInfo> typeInfos = new HashMap<>();
		Map<String, Property> properties = new HashMap<>();

		// Collect type information ============================================
		for (Element elem : roundEnv.getElementsAnnotatedWith(YWCSSType.class)) {
			TypeElement tElem = (TypeElement) elem;

			MethodInfo parseMethod = findMethodByAnnotation(tElem, YWCSSParserEntry.class, new TypeMirror[] {
					elements.getTypeElement("io.github.inseooh.yw.css.syntax.YWCSSTokenStream").asType()
			});
			if (parseMethod == null) {
				continue;
			}
			TypeInfo tInfo = new TypeInfo(tElem.getQualifiedName().toString(), parseMethod.qualifiedName);
			typeInfos.put(tElem.getQualifiedName().toString(), tInfo);
		}

		// Collect simple properties ===========================================
		for (Element elem : roundEnv.getElementsAnnotatedWith(YWCSSSimpleProperty.class)) {
			TypeElement tElem = (TypeElement) elem;
			YWCSSSimpleProperty anno = elem.getAnnotation(YWCSSSimpleProperty.class);
			TypeInfo tInfo = null;
			final String METHOD_NAME = "getInitialValue";
			MethodInfo initialValueMethod = findMethodByName(tElem, METHOD_NAME, new TypeMirror[0]);
			if (initialValueMethod == null) {
				continue;
			}
			String qualifiedName;
			try {
				qualifiedName = anno.type().getCanonicalName();
			} catch (MirroredTypeException mte) {
				qualifiedName = mte.getTypeMirror().toString();
			}
			if (!typeInfos.containsKey(qualifiedName)) {
				messager.printMessage(Diagnostic.Kind.ERROR,
						tElem.getQualifiedName() + " points to unknown type " + qualifiedName
								+ ". Did you forgot to add @" + YWCSSType.class.getSimpleName() + " annotation to it?");
			}
			tInfo = typeInfos.get(qualifiedName);

			SimpleProperty sProp = new SimpleProperty(anno.name(), anno.inheritable(),
					initialValueMethod.getQualifiedName(), tInfo);
			properties.put(tElem.getQualifiedName().toString(), sProp);
		}

		// Collect shorthand properties ========================================
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
					prop = new ShorthandAnyProperty(anno.name(), anno.inheritable(), qualifiedNames);
					break;
				default:
					messager.printMessage(Diagnostic.Kind.ERROR,
							tElem.getQualifiedName()
									+ ": Bad type value " + anno.type());
					continue;
			}
			properties.put(tElem.getQualifiedName().toString(), prop);
		}

		return true;
	}

	private class MethodInfo {
		private final String qualifiedName;
		private final String returnTypeName;

		public MethodInfo(String qualifiedName, String returnTypeName) {
			this.qualifiedName = qualifiedName;
			this.returnTypeName = returnTypeName;
		}

		public String getQualifiedName() {
			return qualifiedName;
		}

		public String getReturnTypeName() {
			return returnTypeName;
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
		Types types = processingEnv.getTypeUtils();
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
			if (!types.isSameType(param.asType(), parameterTypes[i])) {
				messager.printMessage(Diagnostic.Kind.ERROR,
						enclosingElem.getQualifiedName() + ": Parameter " + i + " of " + methodName + " should have "
								+ parameterTypes[i] + ", got " + param.asType());
			}
		}
		// Get return type ---------------------------------------------
		String returnTypeName = methodElem.getReturnType().toString();
		return new MethodInfo(enclosingElem.getQualifiedName() + methodName, returnTypeName);
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

		public abstract String getInitialValue(Map<String, Property> propertyMap);

		public abstract boolean isShorthand();

		public String javaIdentNameOfProp() {
			if (isShorthand()) {
				// We explicitly name shorthand properties ~Shorthand to avoid confusion.
				return YWAPTUtility.camelCaseName(name, true) + "Shorthand";
			} else {
				return YWAPTUtility.camelCaseName(name, true);
			}
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
		public String getInitialValue(Map<String, Property> propertyMap) {
			return String.format("%s()", initialValueMethod);
		}
	}

	private static class ShorthandSidesProperty extends Property {
		private final String top, right, bottom, left;

		public ShorthandSidesProperty(String name, boolean inheritable, String top, String right, String bottom,
				String left) {
			super(name, inheritable);
			this.top = top;
			this.right = right;
			this.bottom = bottom;
			this.left = left;
		}

		private String getTypeName() {
			return String.format("%sShorthand", YWAPTUtility.camelCaseName(getName(), true));
		}

		private String getParseMethodName() {
			return String.format("parse%s", YWAPTUtility.camelCaseName(getTypeName(), true));
		}

		@Override
		public TypeInfo getTypeInfo() {
			return new TypeInfo(getTypeName(), getParseMethodName());
		}

		@Override
		public String getInitialValue(Map<String, Property> propertyMap) {
			return String.format(
					"new %s(%s, %s, %s, %s)",
					getTypeName(),
					propertyMap.get(top).getInitialValue(propertyMap),
					propertyMap.get(right).getInitialValue(propertyMap),
					propertyMap.get(bottom).getInitialValue(propertyMap),
					propertyMap.get(left).getInitialValue(propertyMap));
		}

		@Override
		public boolean isShorthand() {
			return true;
		}

	}

	private static class ShorthandAnyProperty extends Property {
		private final String[] properties;

		public ShorthandAnyProperty(String name, boolean inheritable, String[] properties) {
			super(name, inheritable);
			this.properties = properties;
		}

		private String getTypeName() {
			return String.format("%sShorthand", YWAPTUtility.camelCaseName(getName(), true));
		}

		private String getParseMethodName() {
			return String.format("parse%s", YWAPTUtility.camelCaseName(getTypeName(), true));
		}

		@Override
		public TypeInfo getTypeInfo() {
			return new TypeInfo(getTypeName(), getParseMethodName());
		}

		@Override
		public String getInitialValue(Map<String, Property> propertyMap) {
			StringBuilder sb = new StringBuilder();

			sb.append(String.format("new %s(", getTypeName()));
			for (int i = 0; i < properties.length; i++) {
				if (i != 0) {
					sb.append(", ");
				}
				Property prop = propertyMap.get(properties[i]);
				sb.append(String.format("%s: %s", prop.javaIdentNameOfProp(), prop.getInitialValue(propertyMap)));
			}
			sb.append("}");
			return sb.toString();
		}

		@Override
		public boolean isShorthand() {
			return true;
		}

	}

}
