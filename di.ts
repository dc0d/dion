type Context = {
  kind: string;
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

export const injectable = (
  options: Partial<{
    tags: Tags | string;
    group: string;
  }>,
): (target: unknown, context: Context) => void => {
  return (target: unknown, context: Context) => {
    if (context.kind !== 'class') {
      throw new Error(`@injectable can not be used on ${context.kind}`);
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

  const instances: T[] = [];
  for (const { target: item } of groupItems) {
    const instance = new (item as { new (): T })();
    if (singleton) {
      instances.push(instance);
    }
  }

  if (singleton) {
    groups.set(group, instances);
  }

  return instances as T;
};

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
