// deno-lint-ignore-file no-explicit-any

type Constructor = { new (...args: any[]): NonNullable<unknown> };
type Func = (...args: any[]) => any;

type Context = {
  kind: string;
  name?: string;
  static?: boolean;
  private?: boolean;
  metadata?: unknown;
  addInitializer?(initializer: () => void): void;
  access?: {
    get?(...args: unknown[]): unknown;
    set?(...args: unknown[]): void;
    has?(...args: unknown[]): boolean;
  };
};

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
export const injectable = <T extends Constructor>(
  options: Partial<{
    tags: Tags | string;
    group: string;
  }>,
): Func => {
  return (target: T, context: Context) => {
    if (context.kind !== 'class') {
      throw new Error(`Invalid kind ${context.kind}`);
    }

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
  const instance = new (item as { new (): T })();
  if (singleton) {
    instances.set(tag, instance);
  }

  return instance;
};

const handleGroup = <T extends unknown[]>(
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
    const instance = new (item as { new (): any })();
    if (singleton) {
      instances.push(instance);
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
    return handleGroup(group, singleton) as T;
  }

  throw new Error('Needs either tag or group');
};
