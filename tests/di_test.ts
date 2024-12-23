import './types.ts';

import { describe, it } from 'jsr:@std/testing/bdd';
import { expect } from 'jsr:@std/expect';
import { inject } from '../di.ts';
import { constructorCalls } from './types.ts';
import type {
  Service,
  Service2,
  Service3,
  Service5,
  Service6,
  Service9,
  Service9Prime,
} from './types.ts';

describe('inject', () => {
  it('needs either tag ot group', () => {
    const invalidOptions = {} as { tag: string };
    expect(() => inject<Service>(invalidOptions)).toThrow(
      'Needs either tag or group',
    );
  });
});

describe('Injecting unregistered classes', () => {
  it('Should error on non-existing tag', () => {
    expect(() => inject<Service>({ tag: 'NON_EXISTING_TAG' })).toThrow(
      'No service found for tag: NON_EXISTING_TAG',
    );
  });

  it('Should error on non-existing group', () => {
    expect(() => inject<Service[]>({ group: 'NON_EXISTING_GROUP' })).toThrow(
      'No service found for group: NON_EXISTING_GROUP',
    );
  });
});

describe('Defining & registering services using injectable', () => {
  it('Should work fine no matter the order of defining & registering the services', () => {
    // in types.ts:
    // Service3 is defined first.
    // Service2 is defined second.
    // Service1 is defined last.

    const svc = inject<Service>({ tag: 'service_3' });
    const sut: Service3 = svc as Service3;

    expect(sut.fetchStuff()).toBe('stuff from Service3');
    expect(sut.svc1.fetchStuff()).toBe('stuff from Service1');
    expect(sut.svc2.fetchStuff()).toBe('stuff from Service2');
    expect((sut.svc2 as Service2).svc.fetchStuff()).toBe(
      'stuff from Service1',
    );

    expect(constructorCalls.get('Service1')).toBe(1);
    expect(constructorCalls.get('Service2')).toBe(1);
    expect(constructorCalls.get('Service3')).toBe(1);
  });

  it("Should create a new instance of a service if it's not a singleton", () => {
    const svc = inject<Service>({ tag: 'service_6' });
    const sut: Service6 = svc as Service6;

    expect(sut.fetchStuff()).toBe('stuff from Service6');
    expect(sut.svc1.fetchStuff()).toBe('stuff from Service4');
    expect(sut.svc2.fetchStuff()).toBe('stuff from Service5');
    expect((sut.svc2 as Service5).svc.fetchStuff()).toBe('stuff from Service4');
    expect(constructorCalls.get('Service4')).toBe(2);
    expect(constructorCalls.get('Service5')).toBe(1);
    expect(constructorCalls.get('Service6')).toBe(1);
  });

  describe('Singletons in groups', () => {
    it('Should create instances for all services in a group', () => {
      const svc = inject<Service>({ tag: 'Service9' });
      const sut: Service9 = svc as Service9;

      expect(sut.fetchStuff()).toBe('stuff from Service9');
      expect(sut.scv1.fetchStuff()).toBe('stuff from Service7');
      expect(sut.scv2.fetchStuff()).toBe('stuff from Service8');

      expect(constructorCalls.get('Service7')).toBe(1);
      expect(constructorCalls.get('Service8')).toBe(1);
      expect(constructorCalls.get('Service9')).toBe(1);
    });

    it('Should create instances for all services in a group', () => {
      const svc = inject<Service>({ tag: 'Service9Prime' });
      const sut: Service9Prime = svc as Service9Prime;

      expect(sut.fetchStuff()).toBe('stuff from Service9Prime');
      expect(sut.scv1.fetchStuff()).toBe('stuff from Service7');
      expect(sut.scv2.fetchStuff()).toBe('stuff from Service8');

      expect(constructorCalls.get('Service7')).toBe(1);
      expect(constructorCalls.get('Service8')).toBe(1);
      expect(constructorCalls.get('Service9Prime')).toBe(1);
    });
  });

  it('Should use the name of the class if no tag is provided', () => {
    const svc = inject<Service>({ tag: 'Service9' });
    const sut: Service9 = svc as Service9;

    expect(sut.fetchStuff()).toBe('stuff from Service9');
    expect(constructorCalls.get('Service9')).toBe(1);
  });

  it('Should create new instances for services in a groups that are not singletons', () => {
    inject<Service>({ tag: 'Service12' });
    inject<Service>({ tag: 'Service13' });
    inject<Service>({ tag: 'Service14' });

    expect(constructorCalls.get('Service10')).toBe(3);
    expect(constructorCalls.get('Service11')).toBe(3);
  });
});
