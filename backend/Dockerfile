FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
RUN useradd --system --create-home thunderfood && mkdir -p /app/uploads && chown -R thunderfood /app
WORKDIR /app
COPY --from=build /src/target/thunderfood-backend-*.jar app.jar
USER thunderfood
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
