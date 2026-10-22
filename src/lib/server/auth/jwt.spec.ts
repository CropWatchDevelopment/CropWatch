import { describe, expect, it } from 'vitest';
import { decodeJwtPayload } from './jwt';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = (payload: unknown) => [encode({ alg: 'HS256' }), encode(payload), 'c2ln'].join('.');

describe('decodeJwtPayload', () => {
	it('reads the payload of a well-formed token (without verifying it)', () => {
		expect(decodeJwtPayload(token({ sub: 'user-1', exp: 1_900_000_000 }))).toEqual({
			sub: 'user-1',
			exp: 1_900_000_000
		});
	});

	it.each([
		['not a JWT', 'not-a-jwt'],
		['too many parts', 'a.b.c.d'],
		['an empty payload', 'a..c'],
		['a payload that is not JSON', `a.${Buffer.from('nope').toString('base64url')}.c`],
		['a payload that is not an object', token(['exp', 1])],
		['a null payload', token(null)],
		['no numeric exp', token({ sub: 'user-1', exp: 'tomorrow' })]
	])('returns null for %s', (_label, value) => {
		expect(decodeJwtPayload(value)).toBeNull();
	});
});
