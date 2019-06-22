const assert = require('chai').assert;
const Bifrost = require('../lib');

const bifrost = new Bifrost('mongodb://localhost/bftest');
const connected = bifrost.connect();

describe('bifrost', function () {
    describe('Without scope', function () {
        var role = random();
        var resource = random();
        var resource2 = random();
        var action = random();
        var action2 = random();
        var user = random();
        var user2 = random();

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
            assert.isFalse(result);
        });

        it('should successfully assign the role to the user', async function () {
            await bifrost.assign(user, role);
            var userRoles = await bifrost.connector.getRoles(user);
            assert.isTrue(userRoles.includes(role));
        });

        it('should allow the user to perform the action on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action);
            assert.isTrue(result);
        });

        it('should not allow the user to perform other actions on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action2);
            assert.isFalse(result);
        });

        it('should not allow the user to perform the actions on other resources', async function () {
            var result = await bifrost.allowed(user, resource2, action);
            assert.isFalse(result);
        });

        it('should not allow other users to access the resource in any way', async function () {
            var result = await bifrost.allowed(user2, resource, action);
            assert.isFalse(result);
        });
    });

    describe('With scope', function () {
        var role = random();
        var resource = random();
        var resource2 = random();
        var action = random();
        var action2 = random();
        var user = random();
        var user2 = random();
        var scope = random();
        var scope2 = random();

        it('should successfully add role permission', async function () {
            bifrost.allow(role, resource, action);
            assert.isTrue(bifrost.aclist[role][resource].includes(action));
        });

        it('should unassign the user from the role', async function () {
            await bifrost.unassign(user, role, scope);
            await bifrost.unassign(user2, role, scope2);

            var userRoles = await bifrost.connector.getRolesWithScopes(user);
            var userRoles2 = await bifrost.connector.getRolesWithScopes(user2);

            if (Array.isArray(userRoles[role])) {
                assert.isFalse(userRoles[role].includes(scope));
            } else {
                assert.isTrue(true);
            }

            if (Array.isArray(userRoles2[role])) {
                assert.isFalse(userRoles2[role].includes(scope2));
            } else {
                assert.isTrue(true);
            }
        });

        it('should not allow the user to perform the action on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action, scope);
            var result2 = await bifrost.allowed(user2, resource, action, scope2);
            assert.isFalse(result);
            assert.isFalse(result2);
        });

        it('should successfully assign the role to the user', async function () {
            await bifrost.assign(user, role, scope);
            await bifrost.assign(user2, role, scope2);

            var userRoles = await bifrost.connector.getRolesWithScopes(user);
            var userRoles2 = await bifrost.connector.getRolesWithScopes(user2);

            assert.isTrue(userRoles[role].includes(scope));
            assert.isTrue(userRoles2[role].includes(scope2));
        });

        it('should allow the user to perform the action on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action, scope);
            var result2 = await bifrost.allowed(user2, resource, action, scope2);

            assert.isTrue(result);
            assert.isTrue(result2);
        });

        it('should not allow the user to perform other actions on the resource', async function () {
            var result = await bifrost.allowed(user, resource, action2, scope);
            var result2 = await bifrost.allowed(user2, resource, action2, scope2);

            assert.isFalse(result);
            assert.isFalse(result2);
        });

        it('should not allow the user to perform the actions on other resources', async function () {
            var result = await bifrost.allowed(user, resource2, action, scope);
            var result2 = await bifrost.allowed(user2, resource2, action, scope2);

            assert.isFalse(result);
            assert.isFalse(result2);
        });

        it('should not allow other users to access the resource in any way', async function () {
            var result = await bifrost.allowed(user2, resource, action, scope);
            var result2 = await bifrost.allowed(user, resource, action, scope2);

            assert.isFalse(result);
            assert.isFalse(result2);
        });

        
    });
});


function random() {
    return (Math.random() + Math.random()).toString();
}
