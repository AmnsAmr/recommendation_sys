package org.vidrec.recommendationservice.content;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public final class ContentVectorizer {

    public static final int VECTOR_SIZE = 128;

    private ContentVectorizer() {
    }

    public static double[] encode(List<String> tags, String categoryId, String language) {
        double[] vector = new double[VECTOR_SIZE];

        if (tags != null) {
            for (String tag : tags) {
                addFeature(vector, "tag:" + normalizeToken(tag), 1.0);
            }
        }
        addFeature(vector, "category:" + normalizeToken(categoryId), 2.0);
        addFeature(vector, "language:" + normalizeToken(language), 0.5);

        return normalize(vector);
    }

    public static Double[] encodeBoxed(List<String> tags, String categoryId, String language) {
        return box(encode(tags, categoryId, language));
    }

    public static double[] toPrimitive(Double[] vector) {
        if (vector == null || vector.length == 0) {
            return new double[VECTOR_SIZE];
        }

        double[] primitive = new double[vector.length];
        for (int i = 0; i < vector.length; i++) {
            primitive[i] = vector[i] == null ? 0.0 : vector[i];
        }
        return primitive;
    }

    public static Double[] box(double[] vector) {
        return Arrays.stream(vector).boxed().toArray(Double[]::new);
    }

    public static void addFeature(double[] vector, String feature, double weight) {
        if (feature == null || feature.isBlank() || weight == 0.0) {
            return;
        }
        int index = Math.floorMod(feature.hashCode(), vector.length);
        vector[index] += weight;
    }

    public static double[] normalize(double[] vector) {
        double norm = 0.0;
        for (double value : vector) {
            norm += value * value;
        }
        if (norm == 0.0) {
            return vector;
        }

        double magnitude = Math.sqrt(norm);
        for (int i = 0; i < vector.length; i++) {
            vector[i] = vector[i] / magnitude;
        }
        return vector;
    }

    public static String normalizeToken(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
