CREATE DATABASE interlink;
CREATE USER 'interlinker'@'localhost' IDENTIFIED BY ~~~;
GRANT ALL PRIVILEGES ON interlink.* TO 'interlinker'@'localhost';
USE interlink;

CREATE TABLE user (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(255) NOT NULL,
    `hash`        VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`name`)
);

CREATE TABLE session (
    `id`          BIGINT NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(255) NOT NULL,
    `user_id`     BIGINT NULL,
    `ip`          INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`name`)
);
  
CREATE TABLE potential_matches (
    `id`          BIGINT NOT NULL AUTO_INCREMENT,
    `uri1`        TEXT NOT NULL,
    `uri2`        TEXT NOT NULL,
    `num_results` INT NOT NULL,
    PRIMARY KEY (`id`),
    KEY (`num_results`)
);
  
CREATE TABLE match_results (
    `id`         BIGINT NOT NULL AUTO_INCREMENT,
    `uri1`       TEXT NOT NULL,
    `uri2`       TEXT NOT NULL,
    `match_id`   BIGINT NOT NULL,
    `session_id` BIGINT NOT NULL,
    `result`     ENUM ("owl:sameAs", "skos:closeMatch", "skos:exactMatch", "skos:narrowMatch", "skos:relatedMatch", "skos:broadMatch", "rdfs:seeAlso"),
    PRIMARY KEY (`id`),
    KEY (`match_id`, `session_id`)
);
