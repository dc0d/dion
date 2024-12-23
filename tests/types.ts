import { inject, injectable } from '../di.ts';

export const constructorCalls = new Map<string, number>();

export interface Service {
  fetchStuff(): string;
}

class TestUtil implements Service {
  constructor() {
    constructorCalls.set(
      this.stuff,
      (constructorCalls.get(this.stuff) ?? 0) + 1,
    );
  }

  protected get stuff(): string {
    return this.constructor.name;
  }

  fetchStuff(): string {
    return `stuff from ${this.stuff}`;
  }
}

//

@injectable({ tags: 'service_3' })
export class Service3 extends TestUtil {
  constructor(
    public svc1 = inject<Service>({ tag: 'service_1' }),
    public svc2 = inject<Service>({ tag: 'service_2' }),
  ) {
    super();
  }
}

@injectable({ tags: 'service_2' })
export class Service2 extends TestUtil {
  constructor(public svc = inject<Service>({ tag: 'service_1' })) {
    super();
  }
}

@injectable({ tags: ['service_1'] })
export class Service1 extends TestUtil {}

//

@injectable({ tags: ['service_4'] })
export class Service4 extends TestUtil {}

@injectable({ tags: 'service_5' })
export class Service5 extends TestUtil {
  constructor(
    public svc = inject<Service>({ tag: 'service_4', singleton: false }),
  ) {
    super();
  }
}

@injectable({ tags: 'service_6' })
export class Service6 extends TestUtil {
  constructor(
    public svc1 = inject<Service>({ tag: 'service_4', singleton: false }),
    public svc2 = inject<Service>({ tag: 'service_5' }),
  ) {
    super();
  }
}

//

@injectable({ group: 'group_1' })
export class Service7 extends TestUtil {}

@injectable({ group: 'group_1' })
export class Service8 extends TestUtil {}

@injectable({})
export class Service9 extends TestUtil {
  scv1: Service;
  scv2: Service;

  constructor(services = inject<Service[]>({ group: 'group_1' })) {
    super();

    this.scv1 = services[0];
    this.scv2 = services[1];
  }
}

@injectable({})
export class Service9Prime extends TestUtil {
  scv1: Service;
  scv2: Service;

  constructor(services = inject<Service[]>({ group: 'group_1' })) {
    super();

    this.scv1 = services[0];
    this.scv2 = services[1];
  }
}

@injectable({ group: 'group_2' })
export class Service10 extends TestUtil {}

@injectable({ group: 'group_2' })
export class Service11 extends TestUtil {}

@injectable({})
export class Service12 extends TestUtil {
  scv1: Service;
  scv2: Service;

  constructor(
    services = inject<Service[]>({ group: 'group_2', singleton: false }),
  ) {
    super();

    this.scv1 = services[0];
    this.scv2 = services[1];
  }
}

@injectable({})
export class Service13 extends TestUtil {
  scv1: Service;
  scv2: Service;

  constructor(
    services = inject<Service[]>({ group: 'group_2', singleton: false }),
  ) {
    super();

    this.scv1 = services[0];
    this.scv2 = services[1];
  }
}

@injectable({})
export class Service14 extends TestUtil {
  scv1: Service;
  scv2: Service;

  constructor(
    services = inject<Service[]>({ group: 'group_2', singleton: false }),
  ) {
    super();

    this.scv1 = services[0];
    this.scv2 = services[1];
  }
}
