export type GreetingOptions = {
  name: string;
  excited?: boolean;
};

export function makeGreeting({ name, excited = false }: GreetingOptions): string {
  const base = `Hello, ${name}`;
  return excited ? `${base}!` : `${base}.`;
}

export function greetMany(names: string[], excited?: boolean): string[] {
  return names.map((n) => makeGreeting({ name: n, excited }));
}
