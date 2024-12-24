[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![GitHub top language](https://img.shields.io/github/languages/top/dc0d/dion)
[![JSR](https://jsr.io/badges/@dc0d/dion)](https://jsr.io/@dc0d/dion)
[![JSR Score](https://jsr.io/badges/@dc0d/dion/score)](https://jsr.io/@dc0d/dion)

# dion

`dion` is a simple DI container - at this stage, a playground for trying out an idea.

## how to use

This module provides a simple single-file dependency injection system.
It allows you to register classes as injectable and inject them later as dependencies.
The classes can be registered with tags and/or groups.
The tags are used to inject a single class, while the groups are used to inject multiple classes.
The classes can be singletons or not.

There is this DI pattern used in JavaScript code-bases which injects some default dependencies,
while allowing the user to override them with custom dependencies - for example during unit testing.

```javascript
import { firstDependency } from "./first-dependency.js";
import { secondDependency } from "./second-dependency.js";

const defaultDependencies = {
  firstDependency,
  secondDependency,
};

export class Example {
  constructor(dependencies = defaultDependencies) {
    this.firstDependency = dependencies.firstDependency;
    this.secondDependency = dependencies.secondDependency;
  }
}
```

The dion module provides a similar way for DI. For example you can register the default dependencies:

```typescript
// first_dependency.ts
import { injectable } from "@dc0d/dion";
import { Service } from "./domain.ts";

@injectable({ tags: "first_dependency" })
export class FirstDependency implements Service {
  public get(): string {
    return "FirstDependency";
  }
}
```

```typescript
// second_dependency.ts
import { injectable } from "@dc0d/dion";
import { Service } from "./domain.ts";

@injectable({ tags: "second_dependency" })
export class SecondDependency implements Service {
  public get(): string {
    return "SecondDependency";
  }
}
```

And then inject them in the Example class:

```typescript
import { inject } from "@dc0d/dion";
import { Service } from "./domain.ts";

export class Example {
  #firstDependency: Service;
  #secondDependency: Service;

  constructor(
    firstDependency = inject<Service>({ tag: "first_dependency" }),
    secondDependency = inject<Service>({ tag: "second_dependency" }),
  ) {
    this.#firstDependency = firstDependency;
    this.#secondDependency = secondDependency;
  }

  public run(): void {
    console.log(this.#firstDependency.get());
    console.log(this.#secondDependency.get());
  }
}
```

The upside is the `Example` class has no knowledge of the actual implementations for `FirstDependency` or `SecondDependency` classes - unlike the JavaScript version - and depends only on the interface `Service` which they implement.

# TODO

- Better README.
- Put the sample application in a separate git repository.
- Creat GitHub workflows for publishing to `jsr`.
- Fix `@moduledoc` - or move examples to READMS.
