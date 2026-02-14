CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT plant_id_unique IF NOT EXISTS FOR (p:Plant) REQUIRE p.id IS UNIQUE;

// Plants that may need watering soon
MATCH (u:User)-[:OWNS]->(p:Plant)
WHERE p.nextWaterDue <= date()
RETURN u.id AS userId, p.id AS plantId, p.species AS species;

// Recommend similar plants based on successful care
MATCH (u:User)-[:OWNS]->(p:Plant)
WHERE p.health_status = "healthy"
WITH u, collect(DISTINCT p.species) AS successfulSpecies
MATCH (candidate:Plant)-[:SIMILAR_TO]->(similar:Plant)
WHERE candidate.species IN successfulSpecies
RETURN DISTINCT similar.species AS recommendedSpecies
LIMIT 10;

// Care pattern summary
MATCH (u:User)-[:OWNS]->(p:Plant)-[:RECEIVED_CARE]->(e:CareEvent)
RETURN u.id AS userId, p.id AS plantId, e.type AS eventType, count(*) AS count
ORDER BY count DESC;
