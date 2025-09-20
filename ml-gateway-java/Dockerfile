# Build
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -q -e -DskipTests package

# Run
FROM eclipse-temurin:21-jre
WORKDIR /opt/app
COPY --from=build /app/target/ml-gateway-java-*.jar app.jar
EXPOSE 8080
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
