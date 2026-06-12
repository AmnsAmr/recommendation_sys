FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q -DskipTests dependency:go-offline

COPY ca.pem client.keystore.p12 client.truststore.jks ./
COPY src/ src/
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app

# ffmpeg is used to extract a thumbnail frame from native uploads.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/ca.pem /app/client.keystore.p12 /app/client.truststore.jks ./
COPY --from=build /app/target/*.jar /app/app.jar
EXPOSE 8082

ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
