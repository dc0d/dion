/**
 * @module
 *
 * This module provides a simple single-file dependency injection system.
 * It allows you to register classes as injectable and inject them later as dependencies.
 * The classes can be registered with tags and/or groups.
 * The tags are used to inject a single class, while the groups are used to inject multiple classes.
 * The classes can be singletons or not.
 *
 * There is this DI pattern used in JavaScript code-bases which injects some default dependencies,
 * while allowing the user to override them with custom dependencies - for example during unit testing.
 *
 * ```javascript
 * import { firstDependency } from "./first-dependency.js";
 * import { secondDependency } from "./second-dependency.js";
 *
 * const defaultDependencies = {
 *   firstDependency,
 *   secondDependency,
 * };
 *
 * export class Example {
 *   constructor(dependencies = defaultDependencies) {
 *     this.firstDependency = dependencies.firstDependency;
 *     this.secondDependency = dependencies.secondDependency;
 *   }
 * }
 * ```
 *
 * The dion module provides a similar way for DI. For example you can register the default dependencies:
 *
 * ```typescript
 * // first_dependency.ts
 * import { injectable } from "@dc0d/dion";
 * import { Service } from "./domain.ts";
 *
 * @injectable({ tags: "first_dependency" })
 * export class FirstDependency implements Service {
 *   public get(): string {
 *     return "FirstDependency";
 *   }
 * }
 * ```
 *
 * ```typescript
 * // second_dependency.ts
 * import { injectable } from "@dc0d/dion";
 * import { Service } from "./domain.ts";
 *
 * @injectable({ tags: "second_dependency" })
 * export class SecondDependency implements Service {
 *   public get(): string {
 *     return "SecondDependency";
 *   }
 * }
 * ```
 *
 * And then inject them in the Example class:
 *
 * ```typescript
 * import { inject } from "@dc0d/dion";
 * import { Service } from "./domain.ts";
 *
 * export class Example {
 *   #firstDependency: Service;
 *   #secondDependency: Service;
 *
 *   constructor(
 *     firstDependency = inject<Service>({ tag: "first_dependency" }),
 *     secondDependency = inject<Service>({ tag: "second_dependency" }),
 *   ) {
 *     this.#firstDependency = firstDependency;
 *     this.#secondDependency = secondDependency;
 *   }
 *
 *   public run(): void {
 *     console.log(this.#firstDependency.get());
 *     console.log(this.#secondDependency.get());
 *   }
 * }
 * ```
 */

// deno-lint-ignore-file no-explicit-any

type Tags = [string, ...string[]];

type RegisteredClass = Readonly<{
  target: unknown;
  tags: Tags;
  group: string | null | undefined;
}>;

const classRegistry = new Map<string, RegisteredClass>();
const groupRegistry = new Map<string, RegisteredClass[]>();

const normalizeTags = (
  tags: string | string[] | undefined,
  target: unknown,
): Tags => {
  let tagList: string[] = [];
  if (typeof tags === 'string') {
    if (tags !== '') {
      tagList = [tags];
    } else {
      tagList = [];
    }
  } else {
    tagList = tags as string[];
  }

  tagList = tagList ?? [];
  const { name } = target as { name?: string };
  if (tagList.length === 0 && name) {
    tagList = [name];
  }
  if (tagList.length === 0) {
    throw new Error('No tags provided');
  }

  return tagList as Tags;
};

/**
 * This is a decorator that registers a class as injectable.
 *
 * ```typescript
 * @injectable({ tags: 'service_tag' })
 * class Service {}
 * ```
 *
 * At least one tag is required. The tag can be a string or an array of strings.
 *
 * @param options The tags and/or the group that refer to a class to be injected later as a dependency.
 * @returns A decorator function.
 */
export const injectable = (
  options: Partial<{
    tags: Tags | string;
    group: string;
  }>,
): (target: unknown) => void => {
  return (target: unknown) => {
    const { tags, group } = options;
    const tagList = normalizeTags(tags, target);

    for (const tag of tagList) {
      const entry: RegisteredClass = {
        target,
        tags: tagList,
        group,
      };
      classRegistry.set(tag, entry);
      if (group) {
        const groupEntry = groupRegistry.get(group) ?? [];
        groupEntry.push(entry);
        groupRegistry.set(group, groupEntry);
      }
    }
  };
};

const instances = new Map<string, unknown>();
const groups = new Map<string, unknown[]>();

interface OnlyTag {
  tag: string;
  group?: never;
}

interface OnlyGroup {
  tag?: never;
  group: string;
}

const handleTag = <T extends unknown>(tag: string, singleton: boolean): T => {
  if (singleton && instances.has(tag)) {
    return instances.get(tag) as T;
  }

  const entry = classRegistry.get(tag);
  if (!entry) {
    throw new Error(`No service found for tag: ${tag}`);
  }

  const { target: item } = entry;
  if (typeof item === 'function' && item?.prototype?.constructor) {
    const instance = new (item as { new (): T })();
    if (singleton) {
      instances.set(tag, instance);
    }

    return instance;
  }

  throw new Error(`Unknown item in class registry: ${item}`);
};

const handleGroup = <T extends unknown>(
  group: string,
  singleton: boolean,
): T => {
  if (singleton && groups.has(group)) {
    return groups.get(group) as T;
  }

  const groupItems = groupRegistry.get(group);
  if (!groupItems) {
    throw new Error(`No service found for group: ${group}`);
  }

  const instances: any[] = [];
  for (const { target: item } of groupItems) {
    if (typeof item === 'function' && item?.prototype?.constructor) {
      const instance = new (item as { new (): any })();
      if (singleton) {
        instances.push(instance);
      }
    } else {
      throw new Error(`Unknown item in group registry: ${item}`);
    }
  }

  if (singleton) {
    groups.set(group, instances);
  }

  return instances as T;
};

/**
 * This function injects a class based on the tag or group provided.
 * If the tag is provided, it returns the class registered with that tag.
 * If the group is provided, it returns an array of classes registered with that group.
 *
 * @param options A tag or a group to inject.
 * @returns An instance of the class registered with the tag or the group.
 */
export const inject = <T extends unknown>(
  options: (OnlyTag | OnlyGroup) & Partial<{ singleton: boolean }>,
): T => {
  const { tag, singleton, group } = {
    ...{ singleton: true },
    ...options,
  };

  if (tag) {
    return handleTag(tag, singleton);
  } else if (group) {
    return handleGroup(group, singleton);
  }

  throw new Error('Needs either tag or group');
};
