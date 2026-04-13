FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && \
  groupadd -r spring && useradd -r -g spring spring

USER spring:spring

COPY --chown=spring:spring --from=builder /app/target/*.jar /app/app.jar

EXPOSE 8083

ENTRYPOINT ["java", "-Xms128m", "-Xmx256m", "-XX:+UseG1GC", "-XX:+UseStringDeduplication", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]
