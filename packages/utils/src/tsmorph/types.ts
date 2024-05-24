import type { Expression, PropertyAssignment } from "ts-morph";

export interface TypedPropertyAssignment<Initializer extends Expression> extends PropertyAssignment {
  getInitializer: () => Initializer;
}
