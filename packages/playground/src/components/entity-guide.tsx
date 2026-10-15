import type { Entity } from "../lib/api";

export function entityDescription(entity: Entity) {
  return [entity.purpose, entity.instructions, entity.description].find(
    (value) => typeof value === "string" && value.trim(),
  );
}

export function EntityGuide({ entity }: { entity: Entity }) {
  const description = entityDescription(entity);
  if (!description) return null;
  return (
    <details className="entity-guide">
      <summary>About this {entity.steps ? "workflow" : "agent"}</summary>
      <p>{description}</p>
    </details>
  );
}
