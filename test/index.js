const assert = require('chai').assert;
const Bifrost = require('../lib');

const bifrost = new Bifrost('mongodb://localhost/bftest');
const connected = bifrost.connect();

describe('bifrost', function () {
    describe('Without scope', function () {
        var role = 'librarian';
        var resource = 'books';
        var resource2 = 'benches';
        var action = 'edit';
        var action2 = 'delete';
        var user = 'user1';
        var user2 = 'user_xyz';

        it('should successfully add role permission', async function () {
            bifrost.allow(role, resource, action);
            assert.isTrue(bifrost.aclist[role][resource].includes(action));
        });

        it('should unassign the user from the role', async function () {
            // Wait for the database to be connected
            await connected;

            await bifrost.unassign(user, role);
            var userRoles = await bifrost.connector.getRoles(user);
            assert.isFalse(userRoles.includes(role));
        });

        it('should not allow the user to perform the action on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action);
            assert.equal(result, false);
        });

        it('should successfully assign the role to the user', async function () {
            await bifrost.assign(user, role);
            var userRoles = await bifrost.connector.getRoles(user);
            assert.isTrue(userRoles.includes(role));
        });

        it('should allow the user to perform the action on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action);
            assert.equal(result, true);
        });

        it('should not allow the user to perform other actions on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action2);
            assert.equal(result, false);
        });

        it('should not allow the user to perform the actions on other resources', async function () {
            var result = await bifrost.allowed(user, resource2, action);
            assert.equal(result, false);
        });

        it('should not allow other users to access the resource in any way', async function () {
            var result = await bifrost.allowed(user2, resource, action);
            assert.equal(result, false);
        });
    });

    describe('With scope', function () {
        var role = 'accountant';
        var resource = 'invoice';
        var resource2 = 'marks';
        var action = 'create';
        var action2 = 'read';
        var user = 'acc1';
        var user2 = 'acc2';
        var scope = 'jnv';
        var scope2 = 'kv';
        var parentScope = 'nvs';
        var parentScope2 = 'kvs';

        it('should successfully add role permission', async function () {
            bifrost.allow(role, resource, action);
            assert.isTrue(bifrost.aclist[role][resource].includes(action));
        });

        it('should unassign the user from the role', async function () {
            await bifrost.unassign(user, role, scope);
            var userRoles = await bifrost.connector.getRolesWithScopes(user);
            if (Array.isArray(userRoles[role])) {
                assert.isFalse(userRoles[role].includes(scope));
            } else {
                assert.isTrue(true);
            }
        });

        it('should not allow the user to perform the action on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action, scope);
            assert.equal(result, false);
        });

        it('should successfully assign the role to the user', async function () {
            await bifrost.assign(user, role, scope);
            var userRoles = await bifrost.connector.getRolesWithScopes(user);
            assert.isTrue(userRoles[role].includes(scope));
        });

        it('should allow the user to perform the action on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action, scope);
            assert.equal(result, true);
        });

        it('should not allow the user to perform other actions on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action2, scope);
            assert.equal(result, false);
        });

        it('should not allow the user to perform the actions on other resources', async function () {
            var result = await bifrost.allowed(user, resource2, action, scope);
            assert.equal(result, false);
        });

        it('should not allow other users to access the resource in any way', async function () {
            var result = await bifrost.allowed(user2, resource, action, scope);
            assert.equal(result, false);
        });
    });
});
