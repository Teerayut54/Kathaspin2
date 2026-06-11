// Augment fabric types to allow attaching an `id` to objects/groups
declare module 'fabric' {
  // Some fabric typings export interfaces named `Object` and `Group`.
  // We add an optional `id` property so code can attach identifiers safely.
  export interface Object {
    id?: string;
  }

  export interface Group {
    id?: string;
  }
}

export {};
